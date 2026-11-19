package com.cediwise.app.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

class MoMoUploadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
  override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
    val settings = MoMoQueueStore.settings(applicationContext)
    if (!settings.optBoolean("enabled")) return@withContext Result.success()
    val userId = settings.optString("userId").takeIf { it.isNotBlank() && it != "null" } ?: return@withContext Result.success()
    val token = settings.optString("token").takeIf { it.isNotBlank() && it != "null" } ?: return@withContext Result.success()
    val apiUrl = settings.optString("apiUrl").takeIf { it.startsWith("https://") } ?: return@withContext Result.success()
    if (ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
      MoMoQueueStore.pause(applicationContext, userId)
      return@withContext Result.success()
    }
    var shouldRetry = false
    MoMoQueueStore.items(applicationContext).forEach { (key, row) ->
      if (row.optString("userId") != userId) {
        // Another account may have configured capture since this snapshot: re-check before deleting.
        val latest = MoMoQueueStore.settings(applicationContext)
        if (!latest.optBoolean("enabled") || latest.optString("userId") != userId) {
          return@withContext Result.success()
        }
        MoMoQueueStore.remove(applicationContext, key)
        return@forEach
      }
      if (row.optString("state") in setOf("review", "auth_required", "failed_terminal")) return@forEach
      val candidate = row.optJSONObject("candidate") ?: return@forEach
      val current = MoMoQueueStore.settings(applicationContext)
      if (!current.optBoolean("enabled") || current.optString("userId") != userId) {
        return@withContext Result.success()
      }
      // Permission can be revoked while this worker is processing a batch.
      // Stop before sending the next queued message and pause capture.
      if (ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
        MoMoQueueStore.pause(applicationContext, userId)
        return@withContext Result.success()
      }
      try {
        val connection = URL(apiUrl).openConnection() as HttpURLConnection
        try {
          connection.requestMethod = "POST"
          connection.connectTimeout = 15_000
          connection.readTimeout = 20_000
          connection.doOutput = true
          connection.setRequestProperty("Authorization", "Bearer $token")
          connection.setRequestProperty("X-Supabase-Access-Token", token)
          connection.setRequestProperty("Content-Type", "application/json")
          connection.outputStream.use { it.write(JSONObject().put("candidate", candidate).toString().toByteArray()) }
          val status = connection.responseCode
          val responseStream = if (status in 200..299) connection.inputStream else connection.errorStream
          val response = responseStream?.bufferedReader()?.use { it.readText() }.orEmpty()
          val currentAfterRequest = MoMoQueueStore.settings(applicationContext)
          if (
            !currentAfterRequest.optBoolean("enabled") ||
            currentAfterRequest.optString("userId") != userId ||
            currentAfterRequest.optString("token") != token
          ) {
            return@withContext Result.success()
          }
          if (status in 200..299) {
            val outcome = runCatching { JSONObject(response).optString("status") }.getOrNull()
            when (outcome) {
              "parsed", "duplicate", "skipped", "reversed" -> MoMoQueueStore.remove(applicationContext, key)
              "needs_review" -> MoMoQueueStore.mark(applicationContext, key, "review")
              "retryable" -> {
                MoMoQueueStore.mark(applicationContext, key, "retryable")
                shouldRetry = true
              }
              else -> MoMoQueueStore.mark(applicationContext, key, "failed_terminal")
            }
          } else if (status == 401 || status == 403) {
            MoMoQueueStore.mark(applicationContext, key, "auth_required")
          } else if (status == 422) {
            val errorCode = runCatching { JSONObject(response).optString("error") }.getOrNull()
            if (errorCode == "no_active_budget_cycle") {
              MoMoQueueStore.mark(applicationContext, key, "retryable", errorCode)
            } else {
              MoMoQueueStore.mark(applicationContext, key, "review")
            }
          } else if (status == 408 || status == 429 || status >= 500) {
            MoMoQueueStore.mark(applicationContext, key, "retryable")
            shouldRetry = true
          } else {
            MoMoQueueStore.mark(applicationContext, key, "failed_terminal")
          }
        } finally {
          connection.disconnect()
        }
      } catch (_: Exception) {
        MoMoQueueStore.mark(applicationContext, key, "retryable")
        shouldRetry = true
      }
    }
    if (shouldRetry) Result.retry() else Result.success()
  }

  companion object {
    private const val UNIQUE_NAME = "cediwise-momo-upload"

    fun cancel(context: Context) {
      WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_NAME)
    }

    fun enqueue(context: Context) {
      val request = OneTimeWorkRequestBuilder<MoMoUploadWorker>()
        .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
        .build()
      WorkManager.getInstance(context).enqueueUniqueWork(UNIQUE_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
    }
  }
}
