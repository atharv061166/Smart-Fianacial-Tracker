import { format, parse } from 'date-fns';

export interface Transaction {
  accountNumber?: string;
  amount: number;
  merchantName: string;
  timestamp: number;
  transactionMode: string;
  upiId?: string;
}

/**
 * Enhanced Kotak Bank Statement Parser
 * Specifically designed to handle Kotak Mahindra Bank statement formats
 */
export function parseKotakBankStatement(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  
  // Preprocess text for better parsing
  text = preprocessKotakText(text);
  
  console.log('Parsing Kotak bank statement...');
  console.log('Sample text:', text.substring(0, 500));
  
  // Split into lines for processing
  const lines = text.split('\n');
  
  // Kotak-specific patterns
  const kotakPatterns = [
    // Standard Kotak format: DD-MM-YYYY Description RefNo Amount(Dr/Cr) Balance
    /(\d{1,2}-\d{1,2}-\d{4})\s+(.+?)\s+([A-Z0-9-]{8,})\s+([0-9,.]+)\s*\(?(Dr|Cr)\)?\s+([0-9,.]+)/gi,
    
    // Kotak format with slash dates: DD/MM/YYYY Description RefNo Amount(Dr/Cr) Balance
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([A-Z0-9-]{8,})\s+([0-9,.]+)\s*\(?(Dr|Cr)\)?\s+([0-9,.]+)/gi,
    
    // Simplified Kotak format without reference number
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\s+(.+?)\s+([0-9,.]+)\s*\(?(Dr|Cr)\)?\s+([0-9,.]+)/gi,
    
    // UPI transactions in Kotak format
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\s+.*?UPI.*?([a-zA-Z0-9@._-]+@[a-zA-Z0-9.-]+).*?([0-9,.]+)\s*\(?(Dr|Cr)\)?\s+([0-9,.]+)/gi,
    
    // NEFT/RTGS/IMPS in Kotak format
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\s+.*?(NEFT|RTGS|IMPS).*?(.+?)\s+([0-9,.]+)\s*\(?(Dr|Cr)\)?\s+([0-9,.]+)/gi
  ];
  
  console.log(`Processing ${lines.length} lines for Kotak transactions`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Try each Kotak pattern
    for (const pattern of kotakPatterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          const transaction = parseKotakTransaction(match, line);
          if (transaction) {
            transactions.push(transaction);
            console.log(`Parsed Kotak transaction: ${transaction.merchantName} - ₹${Math.abs(transaction.amount)}`);
            break; // Move to next line once we find a match
          }
        } catch (error) {
          console.error('Error parsing Kotak transaction:', error);
          continue;
        }
      }
    }
  }
  
  console.log(`Found ${transactions.length} Kotak transactions`);
  return transactions.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Preprocess text specifically for Kotak bank statements
 */
function preprocessKotakText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove common OCR artifacts
    .replace(/[|]/g, ' ')
    .replace(/[^\w\s@.,/-:()₹]/g, ' ')
    // Normalize currency
    .replace(/\b(Rs\.?|INR)\s*/gi, '₹')
    // Clean up common Kotak-specific artifacts
    .replace(/KOTAK\s+MAHINDRA\s+BANK/gi, '')
    .replace(/Statement\s+of\s+Account/gi, '')
    .replace(/Account\s+Number/gi, '')
    .trim();
}

/**
 * Parse a single Kotak transaction from regex match
 */
function parseKotakTransaction(match: RegExpMatchArray, originalLine: string): Transaction | null {
  try {
    let dateStr: string, description: string, amountStr: string, drCrIndicator: string;
    let refNumber: string | undefined;
    let upiId: string | undefined;
    
    // Handle different match patterns
    if (match.length >= 7) {
      // Full format with reference number
      [, dateStr, description, refNumber, amountStr, drCrIndicator] = match;
    } else if (match.length >= 6) {
      // Format without reference number or UPI format
      if (originalLine.toLowerCase().includes('upi')) {
        [, dateStr, upiId, amountStr, drCrIndicator] = match;
        description = `UPI Transfer - ${upiId}`;
      } else {
        [, dateStr, description, amountStr, drCrIndicator] = match;
      }
    } else {
      return null;
    }
    
    // Parse date
    const timestamp = parseKotakDate(dateStr);
    if (!timestamp) return null;
    
    // Parse amount
    const amount = parseKotakAmount(amountStr, drCrIndicator);
    if (isNaN(amount)) return null;
    
    // Clean description
    description = cleanKotakDescription(description);
    
    // Determine transaction mode
    const transactionMode = determineKotakTransactionMode(originalLine, description);
    
    return {
      merchantName: description,
      amount,
      timestamp,
      transactionMode,
      ...(upiId && { upiId }),
      ...(refNumber && { accountNumber: refNumber })
    };
    
  } catch (error) {
    console.error('Error parsing Kotak transaction:', error);
    return null;
  }
}

/**
 * Parse Kotak date format
 */
function parseKotakDate(dateStr: string): number | null {
  try {
    // Normalize date separators
    const normalizedDate = dateStr.replace(/[/-]/g, '/');
    
    // Try DD/MM/YYYY format (most common in Kotak)
    let date = parse(normalizedDate, 'dd/MM/yyyy', new Date());
    if (isNaN(date.getTime())) {
      // Try DD/MM/YY format
      date = parse(normalizedDate, 'dd/MM/yy', new Date());
    }
    
    return isNaN(date.getTime()) ? null : date.getTime();
  } catch {
    return null;
  }
}

/**
 * Parse Kotak amount with Dr/Cr indicator
 */
function parseKotakAmount(amountStr: string, drCrIndicator: string): number {
  // Clean amount string
  const cleanAmount = amountStr.replace(/[,\s₹Rs.]/g, '');
  let amount = parseFloat(cleanAmount);
  
  if (isNaN(amount)) return NaN;
  
  // Apply Dr/Cr indicator
  if (drCrIndicator && drCrIndicator.toLowerCase() === 'dr') {
    amount = -Math.abs(amount);
  } else {
    amount = Math.abs(amount);
  }
  
  return amount;
}

/**
 * Clean Kotak transaction description
 */
function cleanKotakDescription(description: string): string {
  return description
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s@.,_\-\/\\&()]/g, '')
    .substring(0, 100);
}

/**
 * Determine transaction mode for Kotak transactions
 */
function determineKotakTransactionMode(line: string, description: string): string {
  const lowerLine = line.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  if (lowerLine.includes('upi') || lowerDesc.includes('upi')) {
    return 'UPI';
  } else if (lowerLine.includes('neft') || lowerDesc.includes('neft')) {
    return 'NEFT';
  } else if (lowerLine.includes('rtgs') || lowerDesc.includes('rtgs')) {
    return 'RTGS';
  } else if (lowerLine.includes('imps') || lowerDesc.includes('imps')) {
    return 'IMPS';
  } else if (lowerLine.includes('atm') || lowerDesc.includes('atm')) {
    return 'ATM';
  } else if (lowerLine.includes('pos') || lowerDesc.includes('pos') || lowerLine.includes('card')) {
    return 'POS';
  } else if (lowerLine.includes('cheque') || lowerDesc.includes('cheque') || lowerLine.includes('chq')) {
    return 'CHEQUE';
  } else if (lowerLine.includes('cash') || lowerDesc.includes('cash')) {
    return 'CASH';
  } else {
    return 'BANK_TRANSFER';
  }
}
