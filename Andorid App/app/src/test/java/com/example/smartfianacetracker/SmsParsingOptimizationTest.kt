package com.example.smartfianacetracker

import org.junit.Test
import org.junit.Assert.*
import java.util.regex.Pattern
import java.text.SimpleDateFormat
import java.util.*

/**
 * Unit tests for the optimized SMS parsing algorithm
 * Tests the algorithm against the provided sample messages
 */
class SmsParsingOptimizationTest {

    private val testMessages = listOf(
        "BOI -  Rs.410.00 Credited to your Ac XX0589 on 26-05-25 by UPI ref No.589400102736.Avl Bal 4583.96",
        "A/C X5678 Debit Rs.2355.00 for UPI to sima adinath k on 19-05-25 Ref 046519653003. Avl Bal Rs.2.13. If not you? SMS FREEZE \"full a/c\" to 7738062873-IPPB",
        "Dear UPI user A/C X8659 debited by 35.0 on date 21Apr25 trf to Mr  SHREYASH SAN Refno 763846935006. If not u? call 1800111109. -SBI",
        "Sent Rs.20.00 from Kotak Bank AC X1714 to q674757157@ybl on 26-05-25.UPI Ref 384380308617. Not you, https://kotak.com/KBANKT/Fraud",
        "Received Rs.500.00 in your Kotak Bank AC X1714 from 8855916700@ptyes on 24-05-25.UPI Ref:285432014240."
    )

    @Test
    fun testBankingMessageDetection() {
        testMessages.forEach { message ->
            assertTrue("Should detect banking message: $message", isBankingTransactionMessage(message))
        }
    }

    @Test
    fun testAmountExtraction() {
        val expectedAmounts = listOf(410.0, 2355.0, 35.0, 20.0, 500.0)
        
        testMessages.forEachIndexed { index, message ->
            val extractedAmount = extractAmount(message)
            assertEquals("Amount extraction failed for message ${index + 1}", 
                expectedAmounts[index], extractedAmount, 0.01)
        }
    }

    @Test
    fun testTransactionTypeDetection() {
        val expectedTypes = listOf("CREDIT", "DEBIT", "DEBIT", "DEBIT", "CREDIT")
        
        testMessages.forEachIndexed { index, message ->
            val transactionType = determineTransactionType(message)
            assertEquals("Transaction type detection failed for message ${index + 1}", 
                expectedTypes[index], transactionType)
        }
    }

    @Test
    fun testAccountNumberExtraction() {
        val expectedAccounts = listOf("0589", "5678", "8659", "1714", "1714")
        
        testMessages.forEachIndexed { index, message ->
            val (accountNumber, _) = extractAccountInfo(message)
            assertEquals("Account number extraction failed for message ${index + 1}", 
                expectedAccounts[index], accountNumber)
        }
    }

    @Test
    fun testUpiIdExtraction() {
        val expectedUpiIds = listOf("", "", "", "q674757157@ybl", "8855916700@ptyes")
        
        testMessages.forEachIndexed { index, message ->
            val upiId = extractUpiId(message)
            assertEquals("UPI ID extraction failed for message ${index + 1}", 
                expectedUpiIds[index], upiId)
        }
    }

    @Test
    fun testMerchantNameExtraction() {
        val expectedMerchants = listOf("Unknown", "sima adinath k", "Mr  SHREYASH SAN", "q674757157@ybl", "8855916700@ptyes")
        
        testMessages.forEachIndexed { index, message ->
            val transactionType = determineTransactionType(message)
            val merchantName = extractMerchantName(message, transactionType)
            assertEquals("Merchant name extraction failed for message ${index + 1}", 
                expectedMerchants[index], merchantName)
        }
    }

    @Test
    fun testReferenceNumberExtraction() {
        val expectedRefs = listOf("589400102736", "046519653003", "763846935006", "384380308617", "285432014240")
        
        testMessages.forEachIndexed { index, message ->
            val refNumber = extractReferenceNumber(message)
            assertEquals("Reference number extraction failed for message ${index + 1}", 
                expectedRefs[index], refNumber)
        }
    }

    @Test
    fun testBalanceExtraction() {
        val expectedBalances = listOf(4583.96, 2.13, null, null, null)
        
        testMessages.forEachIndexed { index, message ->
            val balance = extractBalance(message)
            if (expectedBalances[index] != null) {
                assertNotNull("Balance extraction failed for message ${index + 1}", balance)
                assertEquals("Balance value incorrect for message ${index + 1}", 
                    expectedBalances[index]!!, balance!!, 0.01)
            } else {
                assertNull("Balance should be null for message ${index + 1}", balance)
            }
        }
    }

    @Test
    fun testTransactionModeExtraction() {
        testMessages.forEach { message ->
            val transactionMode = extractTransactionMode(message)
            assertEquals("Transaction mode should be UPI", "UPI", transactionMode)
        }
    }

    // Copy of optimized functions for testing (same as in SmsService.kt)
    
    private fun isBankingTransactionMessage(message: String): Boolean {
        val lowerMessage = message.lowercase()
        
        val transactionKeywords = listOf(
            "credited", "debited", "payment", "sent", "received", "debit", "credit",
            "transferred", "withdrawn", "deposited", "trf", "transaction"
        )
        
        val amountKeywords = listOf("rs.", "rs ", "inr", "₹", "rupees")
        val accountKeywords = listOf("a/c", "acct", "account", "ac ", "bank", "upi", "neft", "imps", "rtgs")
        val bankNames = listOf("boi", "sbi", "hdfc", "icici", "axis", "kotak", "pnb", "canara", "union", "ippb", "paytm", "phonepe", "gpay", "googlepay")
        
        val hasTransactionKeyword = transactionKeywords.any { lowerMessage.contains(it) }
        val hasAmountKeyword = amountKeywords.any { lowerMessage.contains(it) } || lowerMessage.matches(Regex(".*\\b\\d+\\.\\d{1,2}\\b.*"))
        val hasAccountKeyword = accountKeywords.any { lowerMessage.contains(it) }
        val hasBankName = bankNames.any { lowerMessage.contains(it) }
        val hasUpiRef = lowerMessage.contains("ref") && (lowerMessage.contains("upi") || lowerMessage.matches(Regex(".*ref\\s*(?:no\\.?)?\\s*\\d{6,}.*")))
        val hasAccountPattern = lowerMessage.matches(Regex(".*\\b[x]{1,2}\\d{4,}\\b.*"))
        
        return (hasTransactionKeyword && (hasAmountKeyword || hasAccountKeyword)) ||
               (hasBankName && hasAmountKeyword) || hasUpiRef || (hasAccountPattern && hasAmountKeyword)
    }

    private fun determineTransactionType(message: String): String {
        val lowerMessage = message.lowercase()
        return when {
            lowerMessage.contains("credited") -> "CREDIT"
            lowerMessage.contains("received") -> "CREDIT"
            lowerMessage.contains("credit") && !lowerMessage.contains("credit card") -> "CREDIT"
            lowerMessage.contains("debited") -> "DEBIT"
            lowerMessage.contains("debit") && !lowerMessage.contains("debit card") -> "DEBIT"
            lowerMessage.contains("payment of") || lowerMessage.contains("paid") -> "DEBIT"
            lowerMessage.contains("sent") -> "DEBIT"
            lowerMessage.contains("payment") && lowerMessage.contains("credited to your card") -> "CREDIT"
            lowerMessage.contains("payment") && lowerMessage.contains("card") -> "DEBIT"
            else -> "UNKNOWN"
        }
    }

    private fun extractAmount(message: String): Double {
        val patterns = listOf(
            "(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            "(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*)",
            "([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)\\s*(?:RS|RS\\.|Rs|Rs\\.|INR|₹)",
            "Sent Rs\\.([0-9]+(?:\\.[0-9]{1,2})?)",
            "Received Rs\\.([0-9]+(?:\\.[0-9]{1,2})?)",
            "(?:debited|credited)\\s+(?:by|with|of)?\\s*(?:RS|RS\\.|Rs|Rs\\.|INR|₹)?\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            "(?:Debit|Credit)\\s+(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            "^(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            "\\b([0-9]+\\.[0-9]{1,2})\\b(?=.*(?:credited|debited|sent|received))"
        )

        for (pattern in patterns) {
            val matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(message)
            if (matcher.find()) {
                val amountStr = matcher.group(1)?.replace(",", "")
                val amount = amountStr?.toDoubleOrNull() ?: 0.0
                if (amount > 0) return amount
            }
        }
        return 0.0
    }

    private fun extractAccountInfo(message: String): Pair<String, String> {
        val accountPatterns = listOf(
            "A/[Cc]\\s*[Xx]+([0-9]+)", "Acct\\s*[Xx]+([0-9]+)", "Account\\s*[Xx]+([0-9]+)",
            "AC\\s*[Xx]+([0-9]+)", "Bank\\s*AC\\s*[Xx]+([0-9]+)", "Kotak\\s*Bank\\s*AC\\s*[Xx]+([0-9]+)",
            "\\b[Xx]{1,2}([0-9]{4,})\\b", "(?:your|to your)\\s*Ac\\s*[Xx]{1,2}([0-9]+)",
            "A/C\\s*[Xx]+([0-9]+)", "(?:account|ac|a/c)\\s*(?:no\\.?|number)?\\s*[:#]?\\s*([0-9]{4,})",
            "[Xx]{2,}([0-9]{4,})"
        )

        for (pattern in accountPatterns) {
            val matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(message)
            if (matcher.find()) {
                val extractedNumber = matcher.group(1) ?: ""
                if (extractedNumber.isNotEmpty() && extractedNumber.length >= 4) {
                    return Pair(extractedNumber, "")
                }
            }
        }
        return Pair("", "")
    }

    private fun extractUpiId(message: String): String {
        val patterns = listOf(
            "[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+", "\\d{10}@[a-zA-Z]+", "[a-zA-Z0-9]+@ybl",
            "\\d+@ptyes", "\\d+@[a-zA-Z]+", "[a-zA-Z0-9._-]{3,}@[a-zA-Z]{2,}",
            "\\b[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]{2,}\\b"
        )

        for (pattern in patterns) {
            val matcher = Pattern.compile(pattern).matcher(message)
            if (matcher.find()) {
                val upiId = matcher.group() ?: ""
                if (upiId.contains("@") && upiId.length >= 5) return upiId
            }
        }
        return ""
    }

    private fun extractMerchantName(message: String, transactionType: String): String {
        val patterns = when (transactionType) {
            "DEBIT" -> listOf(
                "(?:to|paid to|sent to)\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:on|at|via|ref|\\d)",
                "for\\s+UPI\\s+to\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:on|at|via|ref|\\d)",
                "trf\\s+to\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:Refno|ref|\\d)",
                "to\\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)"
            )
            "CREDIT" -> listOf(
                "(?:from|received from)\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:on|at|via|ref|\\d)",
                "from\\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)"
            )
            else -> listOf("(?:to|from|paid to|received from|sent to)\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:on|at|via|ref|\\d)")
        }

        for (pattern in patterns) {
            val matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(message)
            if (matcher.find()) {
                val merchant = matcher.group(1)?.trim() ?: "Unknown"
                val cleanMerchant = merchant.replace(Regex("[.,;:]$"), "")
                if (cleanMerchant.isNotEmpty() && cleanMerchant.length <= 50) return cleanMerchant
            }
        }
        return "Unknown"
    }

    private fun extractReferenceNumber(message: String): String {
        val patterns = listOf(
            "ref\\s*No\\.\\s*([0-9]+)", "Ref\\s+([0-9]+)", "Refno\\s+([0-9]+)",
            "UPI\\s*Ref\\s*([0-9]+)", "UPI\\s*Ref:\\s*([0-9]+)"
        )

        for (pattern in patterns) {
            val matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(message)
            if (matcher.find()) {
                val refNumber = matcher.group(1) ?: ""
                if (refNumber.length >= 6) return refNumber
            }
        }
        return ""
    }

    private fun extractBalance(message: String): Double? {
        val patterns = listOf(
            "Avl\\s*Bal\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)",
            "Avl\\s*Bal\\s*(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)"
        )

        for (pattern in patterns) {
            val matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(message)
            if (matcher.find()) {
                val balanceStr = matcher.group(1)?.replace(",", "")
                val balance = balanceStr?.toDoubleOrNull()
                if (balance != null && balance >= 0) return balance
            }
        }
        return null
    }

    private fun extractTransactionMode(message: String): String {
        return when {
            message.uppercase().contains("UPI") -> "UPI"
            message.uppercase().contains("NEFT") -> "NEFT"
            message.uppercase().contains("IMPS") -> "IMPS"
            message.uppercase().contains("RTGS") -> "RTGS"
            else -> ""
        }
    }
}
