package com.cediwise.app.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

class MoMoSmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION || !MoMoQueueStore.canCapture(context)) return
    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
    if (messages.isEmpty()) return
    val sender = messages.first().originatingAddress ?: return
    val body = messages.joinToString("") { it.messageBody ?: "" }
    val receivedAt = messages.minOfOrNull { it.timestampMillis } ?: System.currentTimeMillis()
    val candidate = MoMoSmsParser.parse(sender, body, receivedAt) ?: return
    if (!MoMoQueueStore.providerEnabled(context, candidate.getString("provider"))) return
    if (MoMoQueueStore.add(context, candidate)) MoMoUploadWorker.enqueue(context)
  }
}
