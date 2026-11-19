package com.cediwise.app.sms

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject

class MoMoSmsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "CediWiseMoMoSms"

  @ReactMethod
  fun configure(enabled: Boolean, userId: String?, token: String?, apiUrl: String?, providers: ReadableArray, promise: Promise) {
    try {
      val configured = MoMoQueueStore.configure(context, enabled, userId, token, apiUrl, (0 until providers.size()).mapNotNull { providers.getString(it) })
      if (configured && enabled) MoMoUploadWorker.enqueue(context) else MoMoUploadWorker.cancel(context)
      promise.resolve(configured)
    } catch (error: Exception) {
      promise.reject("momo_configure_failed", error)
    }
  }

  @ReactMethod
  fun pause(userId: String?, promise: Promise) {
    try {
      val paused = MoMoQueueStore.pause(context, userId)
      MoMoUploadWorker.cancel(context)
      promise.resolve(paused)
    } catch (error: Exception) {
      promise.reject("momo_pause_failed", error)
    }
  }

  @ReactMethod
  fun getQueueItems(promise: Promise) {
    try {
      val rows = Arguments.createArray()
      val source = MoMoQueueStore.publicItems(context)
      for (index in 0 until source.length()) rows.pushMap(jsonToMap(source.getJSONObject(index)))
      promise.resolve(rows)
    } catch (error: Exception) {
      promise.reject("momo_queue_read_failed", error)
    }
  }

  @ReactMethod
  fun enqueueReview(candidateJson: String, promise: Promise) {
    try {
      val queued = MoMoQueueStore.addForReview(context, JSONObject(candidateJson))
      promise.resolve(queued)
    } catch (error: Exception) {
      promise.reject("momo_review_queue_failed", error)
    }
  }

  @ReactMethod
  fun retry(promise: Promise) {
    MoMoUploadWorker.enqueue(context)
    promise.resolve(true)
  }

  @ReactMethod
  fun resolveReview(clientImportId: String, classification: String, promise: Promise) {
    val resolved = MoMoQueueStore.resolveReview(context, clientImportId, classification)
    if (resolved) MoMoUploadWorker.enqueue(context)
    promise.resolve(resolved)
  }

  @ReactMethod
  fun dismissQueueItem(clientImportId: String, promise: Promise) {
    promise.resolve(MoMoQueueStore.dismissQueueItem(context, clientImportId))
  }

  @ReactMethod
  fun clearQueue(promise: Promise) {
    try {
      MoMoQueueStore.clear(context)
      promise.resolve(true)
    } catch (error: Exception) {
      // Reject so JS teardown (logout) can continue instead of hanging forever.
      promise.reject("momo_clear_failed", error)
    }
  }

  private fun jsonToMap(json: JSONObject): WritableMap = Arguments.createMap().also { map ->
    json.keys().forEach { key ->
      when (val value = json.get(key)) {
        is JSONObject -> map.putMap(key, jsonToMap(value))
        is JSONArray -> {
          val array = Arguments.createArray()
          for (index in 0 until value.length()) array.pushString(value.get(index).toString())
          map.putArray(key, array)
        }
        is Boolean -> map.putBoolean(key, value)
        is Int -> map.putInt(key, value)
        is Long -> map.putDouble(key, value.toDouble())
        is Double -> map.putDouble(key, value)
        JSONObject.NULL -> map.putNull(key)
        else -> map.putString(key, value.toString())
      }
    }
  }
}
