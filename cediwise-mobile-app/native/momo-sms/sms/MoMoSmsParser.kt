package com.cediwise.app.sms

import org.json.JSONObject
import java.security.MessageDigest
import java.util.Date

internal object MoMoSmsParser {
  private val amount = Regex("GHS\\s*([\\d,]+(?:\\.\\d{1,2})?)", RegexOption.IGNORE_CASE)
  private val transactionAmount = Regex("(?:Payment\\s+(?:made\\s+)?for|You\\s+have\\s+(?:successfully\\s+)?(?:paid|sent|purchased)|payment\\s+of|Cash\\s+(?:Out|In)\\s+of|Confirmed\\.)\\s*GHS\\s*([\\d,]+(?:\\.\\d{1,2})?)", RegexOption.IGNORE_CASE)
  private val sentAmount = Regex("GHS\\s*([\\d,]+(?:\\.\\d{1,2})?)\\s+(?:sent|paid|debited)\\b", RegexOption.IGNORE_CASE)
  // Runs to the end of the sentence, so a decimal point inside the reference ("12.50") does not end it early.
  private val referenceText = Regex("\\bRef(?:erence)?\\s*:.*?(?:\\.(?=\\s|$)|$)", RegexOption.IGNORE_CASE)
  private val fee = Regex("(?:Fee|You were charged)(?:\\s+was)?[:\\s]+GHS\\s*([\\d,]+(?:\\.\\d{1,2})?)", RegexOption.IGNORE_CASE)
  private val counterparty = Regex("(?:to|sent to)\\s+(.+?)(?=\\s+(?:Current|Available)\\s+Balance|\\s+on\\s+(?:MTN|Telecel|Vodafone)|\\s+Fee:|\\s+Reference:|\\.|$)", RegexOption.IGNORE_CASE)
  private val receiptPatterns = listOf(
    Regex("Financial\\s+Transaction\\s+Id[:\\s]+([A-Z0-9-]+)", RegexOption.IGNORE_CASE),
    Regex("External\\s+Transaction\\s+Id[:\\s]+([A-Z0-9-]+)", RegexOption.IGNORE_CASE),
    Regex("(?:Transaction\\s+ID|Trans\\.?\\s*ID|Txn\\s+ID)[:\\s#]+([A-Z0-9-]+)", RegexOption.IGNORE_CASE),
    Regex("^([A-Z0-9]{10,})\\s+Confirmed\\.", RegexOption.IGNORE_CASE),
  )
  private val reversedReceiptPatterns = listOf(
    Regex("reversal\\s+of\\s+(?:the\\s+)?(?:original\\s+)?(?:transaction\\s+)?(?:id|reference)\\s*[:#]?\\s*([A-Z0-9-]{4,})", RegexOption.IGNORE_CASE),
    Regex("\\b(?:reversed|reversal)\\b[\\s\\S]{0,80}\\boriginal\\s+(?:transaction\\s+)?(?:id|reference)\\s*[:#]?\\s*([A-Z0-9-]{4,})", RegexOption.IGNORE_CASE),
  )
  private val otp = Regex("\\bOTP\\b|verification code|one[- ]time password", RegexOption.IGNORE_CASE)
  private val status = Regex("\\b(?:failed|declined|unsuccessful|pending|processing|cancelled|canceled)\\b", RegexOption.IGNORE_CASE)
  private val reversal = Regex("\\b(?:reversal|reversed)\\b", RegexOption.IGNORE_CASE)

  private fun provider(sender: String): String? {
    val value = sender.uppercase().replace(Regex("[^A-Z0-9]"), "")
    return when {
      value.contains("TELECEL") || value.contains("VODAFONE") || value.contains("TCASH") -> "telecel_cash"
      value.contains("AIRTELTIGO") || value.contains("ATMONEY") -> "at_money"
      value.contains("MTN") || value.contains("MOMO") || value.contains("MOBILEMONEY") -> "mtn_momo"
      else -> null
    }
  }

  // Drops the recipient/sender name after "to" / "from" so keywords inside a merchant name
  // ("CASH INN", "BILL ARTS") cannot decide the event type. Mirrors withoutPartyName in JS.
  private val partyName = Regex(
    "\\b(to|from)\\s+(?!bank\\b|own\\b|wallet\\b)[^.]*?((?:\\s+(?:is|has\\s+been|was))?\\s+(?:failed|declined|unsuccessful|pending|processing|cancelled|canceled))?(?=\\.(?:\\s|$)|\\s+on\\s|$)",
    RegexOption.IGNORE_CASE,
  )

  private fun event(rawBody: String): String {
    val body = rawBody.replace(referenceText, " ").replace(partyName) { "${it.groupValues[1]} ${it.groupValues[2]}" }
    return when {
    body.contains(Regex("revers(?:al|ed)", RegexOption.IGNORE_CASE)) -> "reversal"
    body.contains(Regex("failed|declined|unsuccessful", RegexOption.IGNORE_CASE)) -> "failed"
    body.contains(Regex("pending|processing", RegexOption.IGNORE_CASE)) -> "pending"
    body.contains(Regex("received|cash in", RegexOption.IGNORE_CASE)) -> "incoming"
    body.contains(Regex("cash out|withdraw", RegexOption.IGNORE_CASE)) -> "cash_out"
    body.contains(Regex("bank transfer|\\bto\\s+bank\\b", RegexOption.IGNORE_CASE)) -> "bank_transfer"
    // Person-to-person must win over the airtime/bill keywords and the generic payment wording
    // ("You have sent GHS 10.00 to BILL", "Payment for GHS 10.00 sent to AMA"), otherwise the native
    // queue would upload it as an expense without asking. Mirrors the JS order.
    body.contains(Regex("sent to|you have sent", RegexOption.IGNORE_CASE)) -> "p2p_send"
    body.contains(Regex("airtime|data bundle|bundle", RegexOption.IGNORE_CASE)) -> "airtime_data"
    body.contains(Regex("bill|utility", RegexOption.IGNORE_CASE)) -> "bill_payment"
    body.contains(Regex("merchant|payment made|payment for|you have paid|your payment|purchased|paid to|debited", RegexOption.IGNORE_CASE)) -> "merchant_payment"
    else -> "unknown"
    }
  }

  private fun pesewas(raw: String?): Long? = try {
    raw?.replace(",", "")?.toBigDecimalOrNull()?.movePointRight(2)?.longValueExact()
      ?.takeIf { it in 0..9007199254740991L }
  } catch (_: ArithmeticException) {
    null
  }

  private fun isConfirmedTransaction(provider: String, body: String): Boolean {
    // Status words inside a free-text reference do not make a successful payment pending.
    // Status words inside a merchant or recipient name ("PENDING CO") do not make it pending either.
    val withoutReference = body.replace(referenceText, " ")
    if (otp.containsMatchIn(withoutReference) ||
      status.containsMatchIn(withoutReference.replace(partyName) { "${it.groupValues[1]} ${it.groupValues[2]}" })) return false
    if (reversal.containsMatchIn(body)) return amount.containsMatchIn(body) || reversedReceiptPatterns.any { it.containsMatchIn(body) }
    val patterns = when (provider) {
      "mtn_momo" -> listOf(
        Regex("Payment\\s+made\\s+for\\s+GHS\\s*[\\d,.]+", RegexOption.IGNORE_CASE),
        Regex("Payment\\s+for\\s+GHS\\s*[\\d,.]+", RegexOption.IGNORE_CASE),
        Regex("You\\s+have\\s+successfully\\s+purchased\\s+GHS\\s*[\\d,.]+", RegexOption.IGNORE_CASE),
        Regex("You\\s+have\\s+paid\\s+GHS\\s*[\\d,.]+", RegexOption.IGNORE_CASE),
        Regex("Your\\s+payment\\s+of\\s+GHS\\s*[\\d,.]+.*?has\\s+been(?:\\s+successfully)?\\s+completed", RegexOption.IGNORE_CASE),
        Regex("Cash\\s+Out\\s+of\\s+GHS\\s*[\\d,.]+", RegexOption.IGNORE_CASE),
      )
      "telecel_cash" -> listOf(
        Regex("\\d{10,}\\s+Confirmed\\.\\s*GHS\\s*[\\d,.]+\\s+sent\\s+to", RegexOption.IGNORE_CASE),
        Regex("You\\s+have\\s+sent\\s+GHS\\s*[\\d,.]+", RegexOption.IGNORE_CASE),
        Regex("GHS\\s*[\\d,.]+\\s+sent\\s+to\\s+", RegexOption.IGNORE_CASE),
        Regex("Vodafone\\s+Cash.*?GHS\\s*[\\d,.]+\\s*(?:sent|paid|debited)", RegexOption.IGNORE_CASE),
      )
      else -> listOf(
        Regex("You\\s+have\\s+sent\\s+GHS\\s*[\\d,.]+", RegexOption.IGNORE_CASE),
        Regex("Payment\\s+made\\s+for\\s+GHS\\s*[\\d,.]+", RegexOption.IGNORE_CASE),
        Regex("Your\\s+payment\\s+of\\s+GHS\\s*[\\d,.]+\\s+to\\s+.+?\\s+has\\s+been(?:\\s+successfully)?\\s+completed", RegexOption.IGNORE_CASE),
        Regex("GHS\\s*[\\d,.]+\\s+(?:sent|paid|debited)\\s+to\\s+", RegexOption.IGNORE_CASE),
        Regex("Cash\\s+Out\\s+of\\s+GHS\\s*[\\d,.]+", RegexOption.IGNORE_CASE),
      )
    }
    return patterns.any { it.containsMatchIn(body) }
  }
  private fun hash(value: String): String = MessageDigest.getInstance("SHA-256").digest(value.toByteArray())
    .joinToString("") { "%02x".format(it) }

  fun parse(sender: String, body: String, receivedAt: Long): JSONObject? {
    val normalized = body.replace(Regex("\\s+"), " ").trim()
    val provider = provider(sender) ?: return null
    if (!isConfirmedTransaction(provider, normalized)) return null
    val eventType = event(normalized)
    // Free-text reference fields can quote another amount ("Reference: Payment for GHS 1.00").
    val amountText = normalized.replace(referenceText, " ")
    val principalRaw = if (eventType == "reversal") {
      amount.find(normalized)?.groupValues?.get(1)
    } else {
      (transactionAmount.find(amountText) ?: sentAmount.find(amountText))?.groupValues?.get(1)
    }
    val principal = pesewas(principalRaw)
    if (eventType == "unknown" || eventType == "failed" || eventType == "pending") return null
    if (eventType != "reversal" && (principal == null || principal <= 0)) return null
    if (eventType == "reversal" && principal == null && reversedReceiptPatterns.none { it.containsMatchIn(normalized) }) return null
    val reversedReceipt = reversedReceiptPatterns.firstNotNullOfOrNull { it.find(normalized)?.groupValues?.get(1) }
    val parsedReceipt = receiptPatterns.firstNotNullOfOrNull { it.find(amountText)?.groupValues?.get(1) }
    val receipt = if (eventType == "reversal" && parsedReceipt == reversedReceipt) null else parsedReceipt
    val feeMatch = fee.find(amountText)?.groupValues?.get(1)
    val feePesewas = feeMatch?.let(::pesewas) ?: if (feeMatch == null) 0L else return null
    val counterpartyValue = counterparty.find(normalized)?.groupValues?.get(1)?.trim()?.takeIf { it.isNotBlank() }
    val identity = "$provider|${receipt ?: "no-ref"}|$receivedAt|${hash(normalized)}"
    val candidate = JSONObject()
      .put("schemaVersion", 1).put("clientImportId", "sms-${hash(identity).take(32)}")
      .put("provider", provider).put("eventType", eventType).put("principalPesewas", principal?.takeIf { it > 0 } ?: JSONObject.NULL)
      .put("feePesewas", feePesewas)
      .put("receivedAt", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", java.util.Locale.US).format(Date(receivedAt)))
      .put("counterparty", counterpartyValue ?: JSONObject.NULL).put("receiptId", receipt ?: JSONObject.NULL)
      .put("reversedReceiptId", reversedReceipt ?: JSONObject.NULL).put("parserVersion", "1")
      .put("confidence", if (eventType == "reversal") { if (reversedReceipt != null) "high" else "low" } else "high")
      .put("classification", if (eventType in listOf("merchant_payment", "bill_payment", "airtime_data")) "expense" else JSONObject.NULL)
      .put("categoryId", JSONObject.NULL)
    if (eventType != "reversal" && receipt == null) {
      candidate.put("legacyDedupeKey", "hash:${hash(normalized)}")
    }
    return candidate
  }
}
