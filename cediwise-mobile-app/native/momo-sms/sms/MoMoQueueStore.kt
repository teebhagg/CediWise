package com.cediwise.app.sms

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

/** Queue mutations are synchronized so logout/clear cannot interleave with a worker's read-modify-write. */
internal object MoMoQueueStore {
  private const val FILE = "cediwise_momo_queue_v1"
  private const val ITEM_PREFIX = "item:"
  private const val STATE_DISMISSED = "dismissed"
  /** Longer than the foreground catch-up lookback (2h), so a rescan cannot re-queue a decided item. */
  private const val DISMISSED_TTL_MS = 24L * 60 * 60 * 1000

  private fun prefs(context: Context) = EncryptedSharedPreferences.create(
    context,
    FILE,
    MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
  )

  fun enabled(context: Context): Boolean = prefs(context).getBoolean("enabled", false)

  fun canCapture(context: Context): Boolean {
    val store = prefs(context)
    return store.getBoolean("enabled", false) &&
      !store.getString("userId", null).isNullOrBlank() &&
      !store.getString("token", null).isNullOrBlank() &&
      store.getString("apiUrl", null)?.startsWith("https://") == true
  }

  @Synchronized
  fun configure(context: Context, enabled: Boolean, userId: String?, token: String?, apiUrl: String?, providers: List<String>): Boolean {
    val store = prefs(context)
    val owner = userId?.takeIf { it.isNotBlank() }
    val credential = token?.takeIf { it.isNotBlank() }
    val endpoint = apiUrl?.takeIf { it.startsWith("https://") }
    val ready = enabled && owner != null && credential != null && endpoint != null
    val previousOwner = store.getString("userId", null)
    val editor = store.edit()

    if (!ready || previousOwner != owner) {
      store.all.keys.filter { it.startsWith(ITEM_PREFIX) }.forEach(editor::remove)
    } else {
      // A fresh JS session/token refresh is the only event that re-arms auth failures.
      store.all.filterKeys { it.startsWith(ITEM_PREFIX) }.forEach { (key, value) ->
        try {
          val row = JSONObject(value as String)
          if (row.optString("state") == "auth_required" && row.optString("userId") == owner) {
            row.put("state", "pending")
            editor.putString(key, row.toString())
          }
        } catch (_: Exception) {
          editor.remove(key)
        }
      }
    }

    editor.putBoolean("enabled", ready)
    if (ready) {
      editor.putString("userId", owner)
      editor.putString("token", credential)
      editor.putString("apiUrl", endpoint)
      editor.putString("providers", providers.joinToString(","))
    } else {
      editor.remove("userId")
      editor.remove("token")
      editor.remove("apiUrl")
      editor.putString("providers", providers.joinToString(","))
    }
    editor.apply()
    return ready || !enabled
  }

  /** Pause uploads for a release kill switch while preserving this user's queued imports. */
  @Synchronized
  fun pause(context: Context, userId: String?): Boolean {
    val store = prefs(context)
    val owner = userId?.takeIf { it.isNotBlank() }
    val previousOwner = store.getString("userId", null)
    val editor = store.edit()
    if (owner == null || (previousOwner != null && previousOwner != owner)) {
      store.all.keys.filter { it.startsWith(ITEM_PREFIX) }.forEach(editor::remove)
      editor.remove("userId")
    } else {
      editor.putString("userId", owner)
    }
    editor.putBoolean("enabled", false)
    editor.remove("token")
    editor.remove("apiUrl")
    editor.apply()
    return owner != null
  }

  fun providerEnabled(context: Context, provider: String): Boolean =
    prefs(context).getString("providers", "mtn_momo,telecel_cash,at_money")
      ?.split(",")?.contains(provider) == true

  @Synchronized
  fun add(context: Context, candidate: JSONObject, requestedState: String? = null): Boolean {
    if (!canCapture(context)) return false
    val owner = prefs(context).getString("userId", null) ?: return false
    val id = candidate.getString("clientImportId")
    val key = ITEM_PREFIX + id
    val store = prefs(context)
    if (store.contains(key)) return true
    val initialState = requestedState ?: if (candidate.getString("eventType") == "p2p_send") "review" else "pending"
    val wrapper = JSONObject().put("state", initialState)
      .put("attempts", 0).put("userId", owner).put("candidate", candidate)
    store.edit().putString(key, wrapper.toString()).apply()
    return true
  }

  fun addForReview(context: Context, candidate: JSONObject): Boolean {
    if (candidate.optString("eventType") !in setOf(
        "merchant_payment", "bill_payment", "airtime_data", "p2p_send",
        "cash_out", "bank_transfer", "wallet_transfer", "incoming",
        "reversal", "failed", "pending", "unknown"
      )) return false
    return add(context, candidate, "review")
  }

  @Synchronized
  fun items(context: Context): List<Pair<String, JSONObject>> {
    val store = prefs(context)
    val editor = store.edit()
    var changed = false
    val now = System.currentTimeMillis()
    val result = store.all
      .filterKeys { it.startsWith(ITEM_PREFIX) }
      .mapNotNull { (key, value) ->
        try {
          val row = JSONObject(value as String)
          if (row.optString("state") == STATE_DISMISSED) {
            // Tombstones only block re-queueing; they are never uploaded or shown, and expire.
            if (now - row.optLong("dismissedAt", 0L) > DISMISSED_TTL_MS) {
              editor.remove(key)
              changed = true
            }
            return@mapNotNull null
          }
          val candidate = row.optJSONObject("candidate")
          if (candidate != null) {
            val legacyMessage = candidate.optString("legacyMessage")
              .takeIf { it.isNotBlank() && it != "null" }
            val receiptId = candidate.optString("receiptId")
              .takeIf { it.isNotBlank() && it != "null" }
            if (
              legacyMessage != null && receiptId == null &&
              candidate.optString("eventType") != "reversal" &&
              candidate.optString("legacyDedupeKey").isBlank()
            ) {
              val normalized = legacyMessage.replace(Regex("\\s+"), " ").trim()
              candidate.put("legacyDedupeKey", "hash:${sha256(normalized)}")
            }
            if (candidate.has("legacyMessage") || candidate.has("legacySender")) {
              candidate.remove("legacyMessage")
              candidate.remove("legacySender")
              row.put("candidate", candidate)
              editor.putString(key, row.toString())
              changed = true
            }
          }
          key to row
        } catch (_: Exception) {
          null
        }
      }
      // Oldest first: the store is a map with no order, and a reversal uploaded before its
      // original is recorded as target-not-found and never applied.
      .sortedWith(
        compareBy<Pair<String, JSONObject>>({ receivedAtMs(it.second) })
          // Same timestamp: payments before the reversals that reference them.
          .thenBy { if (it.second.optJSONObject("candidate")?.optString("eventType") == "reversal") 1 else 0 }
      )
    if (changed) editor.apply()
    return result
  }

  private fun receivedAtMs(row: JSONObject): Long = try {
    java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", java.util.Locale.US)
      .parse(row.optJSONObject("candidate")?.optString("receivedAt") ?: "")?.time ?: 0L
  } catch (_: Exception) {
    0L
  }

  private fun sha256(value: String): String = MessageDigest.getInstance("SHA-256")
    .digest(value.toByteArray())
    .joinToString("") { "%02x".format(it) }

  @Synchronized
  fun remove(context: Context, key: String) = prefs(context).edit().remove(key).apply()

  @Synchronized
  fun mark(context: Context, key: String, state: String, errorCode: String? = null) {
    val value = prefs(context).getString(key, null) ?: return
    try {
      val row = JSONObject(value)
      // A row from a cleared or replaced account must never be written back.
      if (row.optString("userId") != prefs(context).getString("userId", null)) return
      // A dismissal marker must not be turned back into a live item by a late worker write.
      if (row.optString("state") == STATE_DISMISSED) return
      row.put("state", state)
      if (errorCode == null) row.remove("errorCode") else row.put("errorCode", errorCode)
      row.put("attempts", row.optInt("attempts", 0) + 1)
      prefs(context).edit().putString(key, row.toString()).apply()
    } catch (_: Exception) {}
  }

  @Synchronized
  fun resolveReview(context: Context, clientImportId: String, classification: String): Boolean {
    if (classification !in setOf("expense", "transfer")) return false
    val key = ITEM_PREFIX + clientImportId
    val store = prefs(context)
    val value = store.getString(key, null) ?: return false
    return try {
      val row = JSONObject(value)
      val candidate = row.optJSONObject("candidate") ?: return false
      if (row.optString("state") != "review" || candidate.optString("eventType") != "p2p_send") return false
      candidate.put("classification", classification)
      row.put("candidate", candidate)
      row.put("state", "pending")
      store.edit().putString(key, row.toString()).apply()
      true
    } catch (_: Exception) {
      false
    }
  }

  @Synchronized
  fun dismissQueueItem(context: Context, clientImportId: String): Boolean {
    val key = ITEM_PREFIX + clientImportId
    val store = prefs(context)
    val value = store.getString(key, null) ?: return false
    return try {
      val row = JSONObject(value)
      if (row.optString("state") !in setOf("review", "failed_terminal")) return false
      // Keep a payload-free marker instead of deleting: add() dedupes on the key, so the same SMS
      // seen again by the overlapping catch-up scan stays dismissed.
      val tombstone = JSONObject()
        .put("state", STATE_DISMISSED)
        .put("userId", row.optString("userId"))
        .put("dismissedAt", System.currentTimeMillis())
      store.edit().putString(key, tombstone.toString()).apply()
      true
    } catch (_: Exception) {
      false
    }
  }

  fun settings(context: Context): JSONObject = JSONObject()
    .put("enabled", enabled(context))
    .put("userId", prefs(context).getString("userId", null))
    .put("token", prefs(context).getString("token", null))
    .put("apiUrl", prefs(context).getString("apiUrl", null))

  fun publicItems(context: Context): JSONArray = JSONArray().also { array ->
    items(context).forEach { (_, row) -> array.put(row) }
  }

  @Synchronized
  fun clear(context: Context) {
    val editor = prefs(context).edit()
    prefs(context).all.keys.filter { it.startsWith(ITEM_PREFIX) }.forEach(editor::remove)
    editor.apply()
  }
}
