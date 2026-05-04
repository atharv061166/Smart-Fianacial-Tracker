package com.example.smartfianacetracker

import java.util.regex.Pattern
import java.text.SimpleDateFormat
import java.util.*

/**
 * Test class to validate the optimized SMS parsing algorithm
 * with the provided sample messages
 */
class SmsParsingTest {

    companion object {
        @JvmStatic
        fun main(args: Array<String>) {
            val testMessages = listOf(
                "BOI -  Rs.410.00 Credited to your Ac XX0589 on 26-05-25 by UPI ref No.589400102736.Avl Bal 4583.96",
                "A/C X5678 Debit Rs.2355.00 for UPI to sima adinath k on 19-05-25 Ref 046519653003. Avl Bal Rs.2.13. If not you? SMS FREEZE \"full a/c\" to 7738062873-IPPB",
                "Dear UPI user A/C X8659 debited by 35.0 on date 21Apr25 trf to Mr  SHREYASH SAN Refno 763846935006. If not u? call 1800111109. -SBI",
                "Sent Rs.20.00 from Kotak Bank AC X1714 to q674757157@ybl on 26-05-25.UPI Ref 384380308617. Not you, https://kotak.com/KBANKT/Fraud",
                "Received Rs.500.00 in your Kotak Bank AC X1714 from 8855916700@ptyes on 24-05-25.UPI Ref:285432014240."
            )

            val parser = SmsParsingTest()

            println("=== SMS PARSING OPTIMIZATION TEST ===\n")

            testMessages.forEachIndexed { index, message ->
                println("Test Message ${index + 1}:")
                println("Original: $message")
                println("Results:")

                val isBanking = parser.isBankingTransactionMessage(message)
                println("  Is Banking Message: $isBanking")

                if (isBanking) {
                    val transactionType = parser.determineTransactionType(message)
                    val amount = parser.extractAmount(message)
                    val (accountNumber, _) = parser.extractAccountInfo(message)
                    val upiId = parser.extractUpiId(message)
                    val merchantName = parser.extractMerchantName(message, transactionType)
                    val transactionMode = parser.extractTransactionMode(message)
                    val balance = parser.extractBalance(message)
                    val refNumber = parser.extractReferenceNumber(message)

                    println("  Transaction Type: $transactionType")
                    println("  Amount: $amount")
                    println("  Account Number: $accountNumber")
                    println("  UPI ID: $upiId")
                    println("  Merchant Name: $merchantName")
                    println("  Transaction Mode: $transactionMode")
                    println("  Balance: $balance")
                    println("  Reference Number: $refNumber")
                }

                println("${"=".repeat(80)}\n")
            }
        }
    }

    // Copy of the optimized functions for testing

    private fun isBankingTransactionMessage(message: String): Boolean {
        val lowerMessage = message.lowercase()

        // Enhanced banking keywords detection
        val transactionKeywords = listOf(
            "credited", "debited", "payment", "sent", "received", "debit", "credit",
            "transferred", "withdrawn", "deposited", "trf", "transaction"
        )

        val amountKeywords = listOf(
            "rs.", "rs ", "inr", "₹", "rupees"
        )

        val accountKeywords = listOf(
            "a/c", "acct", "account", "ac ", "bank", "upi", "neft", "imps", "rtgs"
        )

        val bankNames = listOf(
            "boi", "sbi", "hdfc", "icici", "axis", "kotak", "pnb", "canara", "union",
            "ippb", "paytm", "phonepe", "gpay", "googlepay"
        )

        // Check for transaction keywords
        val hasTransactionKeyword = transactionKeywords.any { lowerMessage.contains(it) }

        // Check for amount indicators
        val hasAmountKeyword = amountKeywords.any { lowerMessage.contains(it) } ||
                               lowerMessage.matches(Regex(".*\\b\\d+\\.\\d{1,2}\\b.*")) // Decimal amounts

        // Check for account/banking keywords
        val hasAccountKeyword = accountKeywords.any { lowerMessage.contains(it) }

        // Check for bank names
        val hasBankName = bankNames.any { lowerMessage.contains(it) }

        // Check for UPI reference patterns
        val hasUpiRef = lowerMessage.contains("ref") &&
                       (lowerMessage.contains("upi") || lowerMessage.matches(Regex(".*ref\\s*(?:no\\.?)?\\s*\\d{6,}.*")))

        // Check for account number patterns (masked accounts like XX1234, X5678)
        val hasAccountPattern = lowerMessage.matches(Regex(".*\\b[x]{1,2}\\d{4,}\\b.*"))

        // A message is considered banking if it has:
        // 1. Transaction keyword AND (amount keyword OR account keyword)
        // 2. OR has bank name AND amount keyword
        // 3. OR has UPI reference
        // 4. OR has account pattern AND amount keyword
        return (hasTransactionKeyword && (hasAmountKeyword || hasAccountKeyword)) ||
               (hasBankName && hasAmountKeyword) ||
               hasUpiRef ||
               (hasAccountPattern && hasAmountKeyword)
    }

    private fun determineTransactionType(message: String): String {
        val lowerMessage = message.lowercase()
        return when {
            // Credit patterns
            lowerMessage.contains("credited") -> "CREDIT"
            lowerMessage.contains("received") -> "CREDIT"
            lowerMessage.contains("credit") && !lowerMessage.contains("credit card") -> "CREDIT"
            // Debit patterns
            lowerMessage.contains("debited") -> "DEBIT"
            lowerMessage.contains("debit") && !lowerMessage.contains("debit card") -> "DEBIT"
            lowerMessage.contains("payment of") || lowerMessage.contains("paid") -> "DEBIT"
            lowerMessage.contains("sent") -> "DEBIT"
            // Card payment specific
            lowerMessage.contains("payment") && lowerMessage.contains("credited to your card") -> "CREDIT"
            lowerMessage.contains("payment") && lowerMessage.contains("card") -> "DEBIT"
            else -> "UNKNOWN"
        }
    }

    private fun extractAmount(message: String): Double {
        val patterns = listOf(
            // Enhanced patterns for various amount formats
            "(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            "(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*)",
            "([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)\\s*(?:RS|RS\\.|Rs|Rs\\.|INR|₹)",
            "Sent Rs\\.([0-9]+(?:\\.[0-9]{1,2})?)",
            "Received Rs\\.([0-9]+(?:\\.[0-9]{1,2})?)",
            // Handle formats like "debited by 35.0"
            "(?:debited|credited)\\s+(?:by|with|of)?\\s*(?:RS|RS\\.|Rs|Rs\\.|INR|₹)?\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            // Handle "Debit Rs.2355.00" format
            "(?:Debit|Credit)\\s+(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            // Handle amount at the beginning
            "^(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            // Handle standalone numbers with decimal (like 35.0, 410.00)
            "\\b([0-9]+\\.[0-9]{1,2})\\b(?=.*(?:credited|debited|sent|received))"
        )

        for (pattern in patterns) {
            val matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(message)
            if (matcher.find()) {
                val amountStr = matcher.group(1)?.replace(",", "")
                val amount = amountStr?.toDoubleOrNull() ?: 0.0
                if (amount > 0) {
                    return amount
                }
            }
        }
        return 0.0
    }

    private fun extractAccountInfo(message: String): Pair<String, String> {
        // Enhanced account number patterns to handle various formats
        val accountPatterns = listOf(
            // Standard patterns with improvements
            "A/[Cc]\\s*[Xx]+([0-9]+)",
            "Acct\\s*[Xx]+([0-9]+)",
            "Account\\s*[Xx]+([0-9]+)",
            "AC\\s*[Xx]+([0-9]+)",
            "Bank\\s*AC\\s*[Xx]+([0-9]+)",
            "Kotak\\s*Bank\\s*AC\\s*[Xx]+([0-9]+)",
            // Handle formats like "XX0589", "X5678", "X8659", "X1714"
            "\\b[Xx]{1,2}([0-9]{4,})\\b",
            // Handle "your Ac XX0589" format
            "(?:your|to your)\\s*Ac\\s*[Xx]{1,2}([0-9]+)",
            // Handle "A/C X5678" format
            "A/C\\s*[Xx]+([0-9]+)",
            // Handle account patterns without X prefix
            "(?:account|ac|a/c)\\s*(?:no\\.?|number)?\\s*[:#]?\\s*([0-9]{4,})",
            // Generic pattern for masked accounts
            "[Xx]{2,}([0-9]{4,})"
        )

        // Enhanced card number patterns
        val cardPatterns = listOf(
            "card\\s*(?:no\\.?)?\\s*(?:ending|ending in)?\\s*([0-9]{4,})",
            "card\\s*[Xx]+([0-9]{4})",
            "(?:debit|credit)\\s*card\\s*[Xx]*([0-9]{4,})"
        )

        var accountNumber = ""
        var cardNumber = ""

        // Try to find account number with priority order
        for (pattern in accountPatterns) {
            val matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(message)
            if (matcher.find()) {
                val extractedNumber = matcher.group(1) ?: ""
                if (extractedNumber.isNotEmpty() && extractedNumber.length >= 4) {
                    accountNumber = extractedNumber
                    break
                }
            }
        }

        // Try to find card number
        for (pattern in cardPatterns) {
            val matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(message)
            if (matcher.find()) {
                cardNumber = matcher.group(1) ?: ""
                break
            }
        }

        return Pair(accountNumber, cardNumber)
    }

    private fun extractUpiId(message: String): String {
        val patterns = listOf(
            // Enhanced UPI ID patterns
            "[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+",
            "\\d{10}@[a-zA-Z]+",  // For phone number based UPI IDs
            // Handle specific formats from sample messages
            "[a-zA-Z0-9]+@ybl",   // q674757157@ybl
            "\\d+@ptyes",         // 8855916700@ptyes
            "\\d+@[a-zA-Z]+",     // Generic phone@provider format
            // More comprehensive UPI patterns
            "[a-zA-Z0-9._-]{3,}@[a-zA-Z]{2,}",
            "\\b[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]{2,}\\b"
        )

        for (pattern in patterns) {
            val matcher = Pattern.compile(pattern).matcher(message)
            if (matcher.find()) {
                val upiId = matcher.group() ?: ""
                // Validate UPI ID format (must contain @ and have reasonable length)
                if (upiId.contains("@") && upiId.length >= 5) {
                    return upiId
                }
            }
        }
        return ""
    }

    private fun extractMerchantName(message: String, transactionType: String): String {
        val patterns = when (transactionType) {
            "DEBIT" -> listOf(
                // Enhanced patterns for debit transactions
                "(?:to|paid to|sent to)\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:on|at|via|ref|\\d)",
                "(?:to|paid to|sent to)\\s+([^\\s]+(?:\\s+[^\\s]+)*?)$",
                // Handle "for UPI to sima adinath k" format
                "for\\s+UPI\\s+to\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:on|at|via|ref|\\d)",
                // Handle "trf to Mr SHREYASH SAN" format
                "trf\\s+to\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:Refno|ref|\\d)",
                // Handle UPI ID patterns
                "to\\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)",
                "to\\s+(\\d{10}@[a-zA-Z]+)",  // For phone number UPI IDs
                // Generic patterns
                "\\bto\\s+([A-Za-z][^\\s]*(?:\\s+[A-Za-z][^\\s]*)*?)\\s+(?:on|at|via|ref|Ref|\\d)"
            )
            "CREDIT" -> listOf(
                // Enhanced patterns for credit transactions
                "(?:from|received from)\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:on|at|via|ref|\\d)",
                "(?:from|received from)\\s+([^\\s]+(?:\\s+[^\\s]+)*?)$",
                // Handle "from 8855916700@ptyes" format
                "from\\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)",
                "from\\s+(\\d{10}@[a-zA-Z]+)",
                // Handle "by UPI" format
                "by\\s+UPI\\s+(?:ref\\s+No\\.)?\\s*([A-Za-z0-9]+)",
                // Generic from patterns
                "\\bfrom\\s+([A-Za-z][^\\s]*(?:\\s+[A-Za-z][^\\s]*)*?)\\s+(?:on|at|via|ref|Ref|\\d)"
            )
            else -> listOf(
                "(?:to|from|paid to|received from|sent to)\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:on|at|via|ref|\\d)",
                "(?:to|from|paid to|received from|sent to)\\s+([^\\s]+(?:\\s+[^\\s]+)*?)$",
                "to\\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)",
                "from\\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)"
            )
        }

        for (pattern in patterns) {
            val matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(message)
            if (matcher.find()) {
                val merchant = matcher.group(1)?.trim() ?: "Unknown"
                // Clean up merchant name
                val cleanMerchant = merchant.replace(Regex("[.,;:]$"), "") // Remove trailing punctuation

                // If the merchant is a UPI ID, handle appropriately
                if (cleanMerchant.contains("@")) {
                    // If it's a phone number UPI ID, return just the phone number
                    if (cleanMerchant.matches(Regex("\\d{10}@[a-zA-Z]+"))) {
                        return cleanMerchant.split("@")[0]
                    }
                    return cleanMerchant
                }

                // Return cleaned merchant name if it's not empty and reasonable
                if (cleanMerchant.isNotEmpty() && cleanMerchant.length <= 50) {
                    return cleanMerchant
                }
            }
        }
        return "Unknown"
    }

    private fun extractTransactionMode(message: String): String {
        return when {
            message.uppercase().contains("IMPS") -> "IMPS"
            message.uppercase().contains("NEFT") -> "NEFT"
            message.uppercase().contains("UPI") -> "UPI"
            message.uppercase().contains("RTGS") -> "RTGS"
            else -> ""
        }
    }

    private fun extractBalance(message: String): Double? {
        val patterns = listOf(
            // Enhanced balance patterns to handle various formats
            "(?:available|avl|bal)(?:ance)?\\s*(?:is)?\\s*(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            "(?:available|avl|bal)(?:ance)?\\s*(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            // Handle "Avl Bal 4583.96" format
            "Avl\\s*Bal\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            // Handle "Avl Bal Rs.2.13" format
            "Avl\\s*Bal\\s*(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            // Handle balance at end of message
            "(?:balance|bal)\\s*(?:RS|RS\\.|Rs|Rs\\.|INR|₹)?\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)\\s*$",
            // Generic balance pattern
            "\\bBal\\s*(?:RS|RS\\.|Rs|Rs\\.|INR|₹)?\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)"
        )

        for (pattern in patterns) {
            val matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(message)
            if (matcher.find()) {
                val balanceStr = matcher.group(1)?.replace(",", "")
                val balance = balanceStr?.toDoubleOrNull()
                if (balance != null && balance >= 0) {
                    return balance
                }
            }
        }
        return null
    }

    private fun extractReferenceNumber(message: String): String {
        val patterns = listOf(
            // Enhanced reference number patterns
            "(?:ref(?:erence)?|txn)\\s*(?:no\\.?|number)?\\s*[:#]?\\s*([A-Za-z0-9]+)",
            "IMPS(?::|\\s+)([A-Za-z0-9]+)",
            "NEFT(?::|\\s+)([A-Za-z0-9]+)",
            // Handle various UPI reference formats
            "UPI\\s*Ref\\s*(?:No\\.?)?\\s*[:#]?\\s*([0-9]+)",
            "UPI\\s*Ref\\s*([0-9]+)",
            "UPI\\s*Ref:\\s*([0-9]+)",
            // Handle "ref No.589400102736" format
            "ref\\s*No\\.\\s*([0-9]+)",
            // Handle "Ref 046519653003" format
            "Ref\\s+([0-9]+)",
            // Handle "Refno 763846935006" format
            "Refno\\s+([0-9]+)",
            // Generic reference patterns
            "(?:reference|ref)\\s*[:#]?\\s*([A-Za-z0-9]{6,})",
            "\\bRef\\s*[:#]?\\s*([A-Za-z0-9]{6,})"
        )

        for (pattern in patterns) {
            val matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(message)
            if (matcher.find()) {
                val refNumber = matcher.group(1) ?: ""
                if (refNumber.length >= 6) { // Ensure minimum length for valid reference
                    return refNumber
                }
            }
        }
        return ""
    }
}
