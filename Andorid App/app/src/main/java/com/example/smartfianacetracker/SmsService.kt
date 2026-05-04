package com.example.smartfianacetracker

import android.app.*
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.provider.Telephony
import android.util.Log
import android.widget.Toast
import androidx.core.app.NotificationCompat
import com.google.firebase.database.FirebaseDatabase
import java.util.regex.Pattern
import java.text.SimpleDateFormat
import java.util.*
import android.app.job.JobInfo
import android.app.job.JobScheduler
import android.content.ComponentName

class SmsService : Service() {
    private var smsReceiver: SmsReceiver? = null
    private val channelId = "SmsForegroundService"
    private var databaseInstance: FirebaseDatabase? = null
    private var isServiceRunning = false
    private val jobScheduler by lazy { getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Starting SMS Service")
        startServiceWithRetry()
        scheduleServiceRestartJob()
    }

    private fun startServiceWithRetry(retryCount: Int = 0) {
        try {
            if (!isServiceRunning) {
                // Initialize components in sequence
                initializeFirebase()
        createNotificationChannel()
                startForegroundWithNotification()
        registerSmsReceiver()
                isServiceRunning = true
                Log.d(TAG, "SMS Service started successfully")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting service (attempt ${retryCount + 1})", e)
            if (retryCount < 3) {
                // Retry after a delay
                android.os.Handler().postDelayed({
                    startServiceWithRetry(retryCount + 1)
                }, 2000) // 2 second delay before retry
            } else {
                handleServiceError("Failed to start service after retries", e)
            }
        }
    }

    private fun handleServiceError(message: String, error: Exception) {
        Log.e(TAG, message, error)
        Toast.makeText(this, "$message: ${error.message}", Toast.LENGTH_LONG).show()
        stopSelf()
    }

    private fun initializeFirebase() {
        try {
            if (databaseInstance == null) {
                Log.d(TAG, "Initializing Firebase in Service")
                databaseInstance = FirebaseDatabase.getInstance("https://skn-hackfest-default-rtdb.asia-southeast1.firebasedatabase.app/")
                databaseInstance?.setPersistenceEnabled(true)

                // Test database connection
                val ref = databaseInstance?.getReference("service_status")
                ref?.setValue("running_${System.currentTimeMillis()}")?.addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        Log.d(TAG, "Firebase connection test successful")
                    } else {
                        Log.e(TAG, "Firebase connection test failed", task.exception)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing Firebase", e)
            throw e
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
            val serviceChannel = NotificationChannel(
                channelId,
                "SMS Monitoring Service",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Monitors SMS transactions"
                    enableLights(true)
                    setShowBadge(true)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                }

                val manager = getSystemService(NotificationManager::class.java)
                manager?.createNotificationChannel(serviceChannel)
                Log.d(TAG, "Notification channel created successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Error creating notification channel", e)
                throw e
            }
        }
    }

    private fun startForegroundWithNotification() {
        try {
            // Create the notification
            val notification = NotificationCompat.Builder(this, channelId)
                .setContentTitle("Transaction Monitor Active")
                .setContentText("Monitoring SMS transactions")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setOngoing(true)
                .setAutoCancel(false)
                .build()

            // Set foreground service type for Android 12+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }

            Log.d(TAG, "Foreground service started with notification")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting foreground service", e)
            throw e
        }
    }

    private fun registerSmsReceiver() {
        try {
            if (smsReceiver == null) {
        smsReceiver = SmsReceiver()
                val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
                registerReceiver(smsReceiver, filter)
                Log.d(TAG, "SMS receiver registered successfully")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error registering SMS receiver", e)
            throw e
        }
    }

    private fun scheduleServiceRestartJob() {
        try {
            val componentName = ComponentName(this, SmsService::class.java)
            val jobInfo = JobInfo.Builder(SERVICE_RESTART_JOB_ID, componentName)
                .setPersisted(true) // Survive reboots
                .setPeriodic(15 * 60 * 1000L) // 15 minutes
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .build()

            val result = jobScheduler.schedule(jobInfo)
            if (result == JobScheduler.RESULT_SUCCESS) {
                Log.d(TAG, "Service restart job scheduled successfully")
            } else {
                Log.e(TAG, "Failed to schedule service restart job")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling service restart job", e)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service onStartCommand called")
        if (!isServiceRunning) {
            startServiceWithRetry()
        }
        // Use START_STICKY to ensure service restarts if killed
        return START_STICKY
    }

    override fun onDestroy() {
        try {
            super.onDestroy()
            isServiceRunning = false

            // Unregister receiver safely
            smsReceiver?.let {
                try {
                    unregisterReceiver(it)
                } catch (e: Exception) {
                    Log.e(TAG, "Error unregistering receiver", e)
                }
            }
            smsReceiver = null

            // Schedule immediate restart
            val intent = Intent(this, BootReceiver::class.java)
            intent.action = "com.example.smartfianacetracker.RESTART_SERVICE"
            sendBroadcast(intent)

            Log.d(TAG, "Service destroyed, restart initiated")
        } catch (e: Exception) {
            Log.e(TAG, "Error in onDestroy", e)
        }
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        try {
            super.onTaskRemoved(rootIntent)
            // Schedule immediate restart
            val restartServiceIntent = Intent(applicationContext, SmsService::class.java)
            val restartServicePendingIntent = PendingIntent.getService(
                applicationContext, 1, restartServiceIntent,
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            )

            val alarmService = applicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmService.setAlarmClock(
                AlarmManager.AlarmClockInfo(
                    System.currentTimeMillis() + 1000,
                    restartServicePendingIntent
                ),
                restartServicePendingIntent
            )

            // Also send broadcast for backup restart mechanism
            sendBroadcast(Intent("com.example.smartfianacetracker.RESTART_SERVICE"))

            Log.d(TAG, "Service task removed, restart scheduled")
        } catch (e: Exception) {
            Log.e(TAG, "Error in onTaskRemoved", e)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    class SmsReceiver : BroadcastReceiver() {
        private var databaseInstance: FirebaseDatabase? = null

        override fun onReceive(context: Context, intent: Intent) {
            try {
            Log.d(TAG, "SMS Received")
                if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
                    Log.d(TAG, "Not an SMS received action")
                    return
                }

                val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
                if (messages.isEmpty()) {
                    Log.d(TAG, "No messages in intent")
                    return
                }

                messages.forEach { sms ->
                    try {
                    val messageBody = sms.messageBody
                        Log.d(TAG, "Full message content: $messageBody")

                        if (isBankingTransactionMessage(messageBody)) {
                            Log.d(TAG, "Transaction message detected, processing...")
                        processTransactionSMS(messageBody)
                    } else {
                            Log.d(TAG, "Not a transaction message, skipping")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error processing individual SMS: ${e.message}", e)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in onReceive: ${e.message}", e)
            }
        }

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

        private fun processTransactionSMS(message: String) {
            try {
                Log.d(TAG, "Processing transaction SMS: $message")

                // Determine transaction type
                val transactionType = determineTransactionType(message)
                Log.d(TAG, "Transaction type: $transactionType")

                // Extract amount
                val amount = extractAmount(message)
                Log.d(TAG, "Amount: $amount")

                // Extract account info
                val (accountNumber, _) = extractAccountInfo(message)
                Log.d(TAG, "Account: $accountNumber")

                // Extract UPI ID
                val upiId = extractUpiId(message)
                Log.d(TAG, "UPI ID: $upiId")

                // Extract merchant name
                val merchantName = extractMerchantName(message, transactionType)
                Log.d(TAG, "Merchant: $merchantName")

                // Extract transaction mode
                val transactionMode = extractTransactionMode(message)
                Log.d(TAG, "Mode: $transactionMode")

                // Create transaction object
                val transaction = Transaction(
                    transactionType = transactionType,
                    amount = amount,
                    timestamp = System.currentTimeMillis(),
                    upiId = upiId,
                    merchantName = merchantName,
                    accountNumber = accountNumber,
                    transactionMode = transactionMode
                )

                // Save transaction
                if (validateTransaction(transaction)) {
                    Log.d(TAG, "Transaction validated, saving to Firebase")
                    saveTransaction(transaction)
                } else {
                    Log.e(TAG, "Invalid transaction data: $transaction")
                }

            } catch (e: Exception) {
                Log.e(TAG, "Error processing transaction SMS: ${e.message}", e)
            }
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

        private fun extractTimestamp(message: String): Long {
            val datePatterns = listOf(
                // Enhanced date patterns to handle various formats
                "\\b(\\d{2})[-/](\\d{2})[-/](\\d{2,4})\\b",  // DD-MM-YY or DD/MM/YYYY
                "\\b(\\d{2})-([A-Za-z]{3})-?(\\d{2,4})\\b",   // DD-MMM-YY format
                // Handle "26-05-25", "19-05-25" format
                "\\b(\\d{1,2})-(\\d{1,2})-(\\d{2})\\b",
                // Handle "21Apr25" format
                "\\b(\\d{1,2})([A-Za-z]{3})(\\d{2})\\b",
                // Handle "on 26-05-25" format
                "on\\s+(\\d{1,2})-(\\d{1,2})-(\\d{2})",
                // Handle "on date 21Apr25" format
                "on\\s+date\\s+(\\d{1,2})([A-Za-z]{3})(\\d{2})"
            )
            val timePattern = "\\b(\\d{1,2})[:.]?(\\d{2})\\b"

            val calendar = Calendar.getInstance()

            // Try to extract date with enhanced parsing
            for (i in datePatterns.indices) {
                val pattern = datePatterns[i]
                val matcher = Pattern.compile(pattern).matcher(message)
                if (matcher.find()) {
                    when (i) {
                        0, 2, 4 -> { // DD-MM-YY formats
                            calendar.set(Calendar.DAY_OF_MONTH, matcher.group(1)?.toInt() ?: 1)
                            calendar.set(Calendar.MONTH, (matcher.group(2)?.toInt() ?: 1) - 1)
                            var year = matcher.group(3)?.toInt() ?: calendar.get(Calendar.YEAR)
                            if (year < 100) year += 2000  // Convert 2-digit year to 4-digit
                            calendar.set(Calendar.YEAR, year)
                        }
                        1 -> { // DD-MMM-YY format
                            calendar.set(Calendar.DAY_OF_MONTH, matcher.group(1)?.toInt() ?: 1)
                            val month = SimpleDateFormat("MMM", Locale.ENGLISH).parse(matcher.group(2))?.let {
                                val cal = Calendar.getInstance()
                                cal.time = it
                                cal.get(Calendar.MONTH)
                            } ?: 0
                            calendar.set(Calendar.MONTH, month)
                            var year = matcher.group(3)?.toInt() ?: calendar.get(Calendar.YEAR)
                            if (year < 100) year += 2000  // Convert 2-digit year to 4-digit
                            calendar.set(Calendar.YEAR, year)
                        }
                        3, 5 -> { // DDMmmYY format (like 21Apr25)
                            calendar.set(Calendar.DAY_OF_MONTH, matcher.group(1)?.toInt() ?: 1)
                            val monthStr = matcher.group(2) ?: ""
                            val month = SimpleDateFormat("MMM", Locale.ENGLISH).parse(monthStr)?.let {
                                val cal = Calendar.getInstance()
                                cal.time = it
                                cal.get(Calendar.MONTH)
                            } ?: 0
                            calendar.set(Calendar.MONTH, month)
                            var year = matcher.group(3)?.toInt() ?: calendar.get(Calendar.YEAR)
                            if (year < 100) year += 2000  // Convert 2-digit year to 4-digit
                            calendar.set(Calendar.YEAR, year)
                        }
                    }
                    break
                }
            }

            // Try to extract time
            val timeMatcher = Pattern.compile(timePattern).matcher(message)
            if (timeMatcher.find()) {
                calendar.set(Calendar.HOUR_OF_DAY, timeMatcher.group(1)?.toInt() ?: 0)
                calendar.set(Calendar.MINUTE, timeMatcher.group(2)?.toInt() ?: 0)
            }

            return calendar.timeInMillis
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

        private fun validateTransaction(transaction: Transaction): Boolean {
            return transaction.transactionType in listOf("CREDIT", "DEBIT") &&
                   transaction.amount > 0 &&
                   transaction.timestamp > 0 &&
                   (transaction.accountNumber.isNotEmpty() || transaction.upiId.isNotEmpty()) &&
                   transaction.merchantName.isNotEmpty()
        }

        private fun saveTransaction(transaction: Transaction) {
            try {
                Log.d(TAG, "Starting to save transaction")

                if (!validateTransaction(transaction)) {
                    Log.e(TAG, "Invalid transaction data: $transaction")
                    return
                }

                // Initialize database if not already initialized
                if (databaseInstance == null) {
                    Log.d(TAG, "Initializing Firebase database in receiver")
                    databaseInstance = FirebaseDatabase.getInstance("https://skn-hackfest-default-rtdb.asia-southeast1.firebasedatabase.app/")
                }

                val database = databaseInstance ?: throw Exception("Failed to initialize Firebase database")

                // Get current user ID from FirebaseAuth
                val currentUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
                if (currentUser == null) {
                    Log.e(TAG, "No authenticated user found, cannot save transaction")
                    return
                }

                val userId = currentUser.uid
                Log.d(TAG, "Saving transaction for user: $userId")

                // Choose collection based on transaction type
                val collectionName = if (transaction.transactionType == "CREDIT") "credit" else "debit"
                val ref = database.getReference("users").child(userId).child(collectionName)

                // Generate a new key for the transaction
                val transactionId = ref.push().key ?: throw Exception("Failed to generate transaction key")

                Log.d(TAG, "Saving ${transaction.transactionType} transaction with ID: $transactionId")
                Log.d(TAG, "Transaction details: $transaction")

                // Create a map of transaction data
                val transactionMap = mapOf(
                    "amount" to transaction.amount,
                    "timestamp" to transaction.timestamp,
                    "upiId" to transaction.upiId,
                    "merchantName" to transaction.merchantName,
                    "accountNumber" to transaction.accountNumber,
                    "transactionMode" to transaction.transactionMode,
                    "createdAt" to System.currentTimeMillis()
                )

                // Save the transaction under user's data
                ref.child(transactionId).setValue(transactionMap)
                    .addOnSuccessListener {
                        Log.d(TAG, "Transaction saved successfully to users/$userId/$collectionName with ID: $transactionId")

                        // Update user's service status
                        database.getReference("users").child(userId)
                            .child("service_status").setValue("active_" + System.currentTimeMillis())

                        // Verify the save
                        ref.child(transactionId).get().addOnSuccessListener { snapshot ->
                            if (snapshot.exists()) {
                                Log.d(TAG, "Verification successful. Saved data: ${snapshot.value}")
                            } else {
                                Log.e(TAG, "Verification failed: Data not found after save")
                            }
                        }
                    }
                    .addOnFailureListener { e ->
                        Log.e(TAG, "Failed to save transaction: ${e.message}", e)
                        throw e
                    }

            } catch (e: Exception) {
                Log.e(TAG, "Error in saveTransaction: ${e.message}", e)
                e.printStackTrace()
            }
        }

        companion object {
            private const val TAG = "SmsReceiver"

            /**
             * Test function to validate SMS parsing with sample messages
             * Can be called for debugging and testing purposes
             */
            fun testSmsParsingOptimization(): String {
                val testMessages = listOf(
                    "BOI -  Rs.410.00 Credited to your Ac XX0589 on 26-05-25 by UPI ref No.589400102736.Avl Bal 4583.96",
                    "A/C X5678 Debit Rs.2355.00 for UPI to sima adinath k on 19-05-25 Ref 046519653003. Avl Bal Rs.2.13. If not you? SMS FREEZE \"full a/c\" to 7738062873-IPPB",
                    "Dear UPI user A/C X8659 debited by 35.0 on date 21Apr25 trf to Mr  SHREYASH SAN Refno 763846935006. If not u? call 1800111109. -SBI",
                    "Sent Rs.20.00 from Kotak Bank AC X1714 to q674757157@ybl on 26-05-25.UPI Ref 384380308617. Not you, https://kotak.com/KBANKT/Fraud",
                    "Received Rs.500.00 in your Kotak Bank AC X1714 from 8855916700@ptyes on 24-05-25.UPI Ref:285432014240."
                )

                val results = StringBuilder()
                results.append("=== SMS PARSING OPTIMIZATION TEST RESULTS ===\n\n")

                testMessages.forEachIndexed { index, message ->
                    results.append("Test Message ${index + 1}:\n")
                    results.append("Original: $message\n")
                    results.append("Results:\n")

                    // Test basic pattern matching for demonstration
                    val lowerMessage = message.lowercase()
                    val isBanking = lowerMessage.contains("credited") || lowerMessage.contains("debited") ||
                                   lowerMessage.contains("sent") || lowerMessage.contains("received") ||
                                   lowerMessage.contains("upi") || lowerMessage.contains("bank")
                    results.append("  Is Banking Message: $isBanking\n")

                    if (isBanking) {
                        // Basic extraction for demonstration
                        val transactionType = when {
                            lowerMessage.contains("credited") || lowerMessage.contains("received") -> "CREDIT"
                            lowerMessage.contains("debited") || lowerMessage.contains("sent") -> "DEBIT"
                            else -> "UNKNOWN"
                        }

                        // Extract amount using basic pattern
                        val amountPattern = "(?:RS|Rs|rs)\\.?\\s*([0-9]+(?:\\.[0-9]{1,2})?)".toRegex()
                        val amount = amountPattern.find(message)?.groupValues?.get(1)?.toDoubleOrNull() ?: 0.0

                        // Extract account using basic pattern
                        val accountPattern = "[Xx]{1,2}([0-9]{4,})".toRegex()
                        val account = accountPattern.find(message)?.groupValues?.get(1) ?: ""

                        // Extract UPI ID using basic pattern
                        val upiPattern = "[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+".toRegex()
                        val upiId = upiPattern.find(message)?.value ?: ""

                        results.append("  Transaction Type: $transactionType\n")
                        results.append("  Amount: $amount\n")
                        results.append("  Account Number: $account\n")
                        results.append("  UPI ID: $upiId\n")
                        results.append("  Note: This is a basic test. Full optimization is in the private methods.\n")
                    }

                    results.append("${"=".repeat(80)}\n\n")
                }

                return results.toString()
            }
        }
    }

    companion object {
        private const val TAG = "SmsService"
        private const val NOTIFICATION_ID = 1
        private const val SERVICE_RESTART_JOB_ID = 100
    }
}