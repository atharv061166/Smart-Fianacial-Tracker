# SMS Parsing Algorithm Optimization Report

## Overview
This document outlines the optimizations made to the SMS parsing algorithm to better extract important details from banking SMS messages, specifically using the provided sample messages as reference.

## Sample Messages Used for Optimization

1. **BOI**: `Rs.410.00 Credited to your Ac XX0589 on 26-05-25 by UPI ref No.589400102736.Avl Bal 4583.96`
2. **IPPB**: `A/C X5678 Debit Rs.2355.00 for UPI to sima adinath k on 19-05-25 Ref 046519653003. Avl Bal Rs.2.13`
3. **SBI**: `Dear UPI user A/C X8659 debited by 35.0 on date 21Apr25 trf to Mr SHREYASH SAN Refno 763846935006`
4. **Kotak**: `Sent Rs.20.00 from Kotak Bank AC X1714 to q674757157@ybl on 26-05-25.UPI Ref 384380308617`
5. **Kotak**: `Received Rs.500.00 in your Kotak Bank AC X1714 from 8855916700@ptyes on 24-05-25.UPI Ref:285432014240`

## Key Optimizations Made

### 1. Enhanced Banking Message Detection (`isBankingTransactionMessage`)

**Previous Issues:**
- Simple keyword matching was insufficient
- Missed some banking messages due to limited patterns

**Optimizations:**
- Added comprehensive keyword lists for transaction types, amounts, accounts, and bank names
- Implemented multi-criteria validation logic
- Added support for UPI reference patterns
- Enhanced account number pattern detection (XX1234, X5678 formats)

**New Features:**
- Detects bank names (BOI, SBI, HDFC, Kotak, etc.)
- Recognizes decimal amount patterns (35.0, 410.00)
- Identifies masked account patterns
- Validates UPI reference numbers

### 2. Improved Amount Extraction (`extractAmount`)

**Previous Issues:**
- Limited regex patterns
- Missed various amount formats

**Optimizations:**
- Added 9 comprehensive regex patterns
- Support for formats like "debited by 35.0"
- Handle "Debit Rs.2355.00" format
- Recognize "Rs.410.00" and "Rs.20.00" formats
- Support standalone decimal numbers with context validation

**New Patterns:**
```regex
"(?:debited|credited)\\s+(?:by|with|of)?\\s*(?:RS|RS\\.|Rs|Rs\\.|INR|₹)?\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)"
"(?:Debit|Credit)\\s+(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)"
"\\b([0-9]+\\.[0-9]{1,2})\\b(?=.*(?:credited|debited|sent|received))"
```

### 3. Enhanced Account Number Extraction (`extractAccountInfo`)

**Previous Issues:**
- Limited account number patterns
- Missed various masking formats

**Optimizations:**
- Added 11 comprehensive account patterns
- Support for formats: XX0589, X5678, X8659, X1714
- Handle "your Ac XX0589" format
- Support "Kotak Bank AC X1714" format
- Minimum length validation (4+ digits)

**New Patterns:**
```regex
"\\b[Xx]{1,2}([0-9]{4,})\\b"  // XX0589, X5678
"(?:your|to your)\\s*Ac\\s*[Xx]{1,2}([0-9]+)"  // your Ac XX0589
"Kotak\\s*Bank\\s*AC\\s*[Xx]+([0-9]+)"  // Kotak Bank AC X1714
```

### 4. Improved Reference Number Extraction (`extractReferenceNumber`)

**Previous Issues:**
- Limited reference patterns
- Missed various UPI reference formats

**Optimizations:**
- Added 11 comprehensive reference patterns
- Support for "ref No.589400102736" format
- Handle "Ref 046519653003" format
- Support "Refno 763846935006" format
- Minimum length validation (6+ characters)

**New Patterns:**
```regex
"ref\\s*No\\.\\s*([0-9]+)"  // ref No.589400102736
"Ref\\s+([0-9]+)"  // Ref 046519653003
"Refno\\s+([0-9]+)"  // Refno 763846935006
"UPI\\s*Ref:\\s*([0-9]+)"  // UPI Ref:285432014240
```

### 5. Enhanced UPI ID Detection (`extractUpiId`)

**Previous Issues:**
- Basic UPI patterns
- Missed specific provider formats

**Optimizations:**
- Added 7 comprehensive UPI patterns
- Support for q674757157@ybl format
- Handle 8855916700@ptyes format
- Validation for minimum length and @ symbol

**New Patterns:**
```regex
"[a-zA-Z0-9]+@ybl"  // q674757157@ybl
"\\d+@ptyes"  // 8855916700@ptyes
"\\d+@[a-zA-Z]+"  // Generic phone@provider
```

### 6. Improved Merchant Name Extraction (`extractMerchantName`)

**Previous Issues:**
- Limited merchant extraction patterns
- Poor handling of names with spaces

**Optimizations:**
- Added transaction-type specific patterns
- Support for "for UPI to sima adinath k" format
- Handle "trf to Mr SHREYASH SAN" format
- Clean up trailing punctuation
- Length validation (≤50 characters)

**New Patterns:**
```regex
"for\\s+UPI\\s+to\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:on|at|via|ref|\\d)"
"trf\\s+to\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:Refno|ref|\\d)"
"from\\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)"
```

### 7. Enhanced Balance Extraction (`extractBalance`)

**Previous Issues:**
- Limited balance patterns
- Missed various balance formats

**Optimizations:**
- Added 6 comprehensive balance patterns
- Support for "Avl Bal 4583.96" format
- Handle "Avl Bal Rs.2.13" format
- Validation for non-negative values

**New Patterns:**
```regex
"Avl\\s*Bal\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)"  // Avl Bal 4583.96
"Avl\\s*Bal\\s*(?:RS|RS\\.|Rs|Rs\\.|INR|₹)\\s*([0-9]+(?:,[0-9]+)*(?:\\.[0-9]{1,2})?)"  // Avl Bal Rs.2.13
```

### 8. Improved Date/Time Parsing (`extractTimestamp`)

**Previous Issues:**
- Limited date format support
- Missed various date patterns

**Optimizations:**
- Added 6 comprehensive date patterns
- Support for "26-05-25", "19-05-25" format
- Handle "21Apr25" format
- Support "on date 21Apr25" format
- Enhanced year conversion (2-digit to 4-digit)

**New Patterns:**
```regex
"\\b(\\d{1,2})-(\\d{1,2})-(\\d{2})\\b"  // 26-05-25
"\\b(\\d{1,2})([A-Za-z]{3})(\\d{2})\\b"  // 21Apr25
"on\\s+date\\s+(\\d{1,2})([A-Za-z]{3})(\\d{2})"  // on date 21Apr25
```

## Expected Results for Sample Messages

Based on the optimizations, the algorithm should now correctly extract:

### Message 1 (BOI):
- **Amount**: 410.00
- **Transaction Type**: CREDIT
- **Account**: 0589
- **Reference**: 589400102736
- **Balance**: 4583.96
- **Transaction Mode**: UPI

### Message 2 (IPPB):
- **Amount**: 2355.00
- **Transaction Type**: DEBIT
- **Account**: 5678
- **Merchant**: sima adinath k
- **Reference**: 046519653003
- **Balance**: 2.13
- **Transaction Mode**: UPI

### Message 3 (SBI):
- **Amount**: 35.0
- **Transaction Type**: DEBIT
- **Account**: 8659
- **Merchant**: Mr SHREYASH SAN
- **Reference**: 763846935006
- **Transaction Mode**: UPI

### Message 4 (Kotak):
- **Amount**: 20.00
- **Transaction Type**: DEBIT
- **Account**: 1714
- **UPI ID**: q674757157@ybl
- **Reference**: 384380308617
- **Transaction Mode**: UPI

### Message 5 (Kotak):
- **Amount**: 500.00
- **Transaction Type**: CREDIT
- **Account**: 1714
- **UPI ID**: 8855916700@ptyes
- **Reference**: 285432014240
- **Transaction Mode**: UPI

## Performance Improvements

1. **Accuracy**: Significantly improved extraction accuracy for all fields
2. **Coverage**: Enhanced support for various bank message formats
3. **Robustness**: Better handling of edge cases and variations
4. **Validation**: Added validation logic to ensure data quality
5. **Maintainability**: Organized patterns by category for easier updates

## Implementation Status

✅ **Completed Optimizations:**
- Enhanced banking message detection
- Improved amount extraction with 9 patterns
- Enhanced account number extraction with 11 patterns
- Improved reference number extraction with 11 patterns
- Enhanced UPI ID detection with 7 patterns
- Improved merchant name extraction with cleanup
- Enhanced balance extraction with 6 patterns
- Improved date/time parsing with 6 patterns

The optimized algorithm is now implemented in `SmsService.kt` and ready for testing with real SMS messages.
