import { format, parse } from 'date-fns'

export interface Transaction {
  accountNumber?: string
  amount: number
  merchantName: string
  timestamp: number
  transactionMode: string
  upiId?: string
}

declare global {
  interface Window {
    pdfjsLib: any
    Tesseract: any
  }
}

/**
 * Renders a PDF page to canvas for OCR processing
 */
async function renderPageToCanvas(page: any, scale = 2.0): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  return canvas;
}

/**
 * Process OCR on a single image with enhanced settings for bank statements
 */
async function performOCR(imageDataUrl: string): Promise<string> {
  if (typeof window === 'undefined' || !window.Tesseract) {
    console.warn('Tesseract not available, skipping OCR');
    return '';
  }

  try {
    console.log('Starting enhanced OCR processing...');
    const result = await window.Tesseract.recognize(
      imageDataUrl,
      'eng',
      {
        logger: (m: any) => console.log(`OCR: ${m.status} ${m.progress ? Math.round(m.progress * 100) + '%' : ''}`),
        tessedit_pageseg_mode: '6', // Uniform block of text
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/-:@() ',
        preserve_interword_spaces: '1',
      }
    );
    console.log('Enhanced OCR completed');
    return result.data.text;
  } catch (error) {
    console.error('OCR error:', error);
    return '';
  }
}

/**
 * Extract text from PDF using both PDF.js text extraction and OCR
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('PDF extraction can only be performed on the client side');
  }

  // Ensure PDF.js is loaded
  if (!window.pdfjsLib) {
    throw new Error('PDF.js library not loaded');
  }

  try {
    // Read the file as an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load the PDF document
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    console.log(`PDF loaded. Pages: ${pdf.numPages}`);

    // First try standard text extraction
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    const standardTextLength = fullText.trim().length;
    console.log(`Standard extraction: ${standardTextLength} characters`);

    // Always try OCR for bank statements as they often have complex layouts
    if (window.Tesseract) {
      console.log('Running OCR for enhanced text extraction...');

      let ocrText = '';

      // Process all pages for better transaction extraction
      const pagesToProcess = Math.min(pdf.numPages, 5); // Process up to 5 pages

      for (let i = 1; i <= pagesToProcess; i++) {
        console.log(`OCR processing page ${i}/${pagesToProcess}`);
        const page = await pdf.getPage(i);
        const canvas = await renderPageToCanvas(page, 3.0); // Higher scale for better OCR
        const imageDataUrl = canvas.toDataURL('image/png');
        const pageText = await performOCR(imageDataUrl);
        ocrText += pageText + '\n';
        canvas.remove();
      }

      const ocrTextLength = ocrText.trim().length;
      console.log(`OCR extraction: ${ocrTextLength} characters`);

      // Use OCR results if they contain more text, or combine both
      if (ocrTextLength > standardTextLength) {
        console.log(`Using OCR results (${ocrTextLength} chars)`);
        return ocrText;
      } else if (ocrTextLength > 0) {
        console.log('Combining standard and OCR results');
        return fullText + '\n' + ocrText;
      }
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error;
  }
}

/**
 * Extract transactions from text using multiple regex patterns
 */
export function extractTransactions(text: string): Transaction[] {
  const transactions: Transaction[] = [];

  // Preprocess text to clean up OCR artifacts
  text = text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[|]/g, ' ') // Replace pipes with spaces
    .replace(/\b(Rs\.?|INR)\s*/gi, '₹') // Normalize currency symbols
    .trim();

  // Log sample for debugging
  console.log('Text sample for extraction:', text.substring(0, 1000));

  // Enhanced patterns specifically optimized for Kotak bank statements and general formats
  const patterns = [
    // Kotak Mahindra Bank specific format: DD-MM-YYYY Description RefNo Amount(Dr/Cr) Balance
    /(\d{1,2}-\d{1,2}-\d{4})\s+([^0-9\n]+?)\s+([A-Z0-9-]{6,})\s+([0-9,.]+)\s*\(?(Dr|Cr)\)?\s+([0-9,.]+)/gi,

    // Alternative Kotak format with slash separators
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+([^0-9\n]+?)\s+([A-Z0-9-]{6,})\s+([0-9,.]+)\s*\(?(Dr|Cr)\)?\s+([0-9,.]+)/gi,

    // Kotak format without reference number
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\s+([A-Za-z0-9\s@._-]+?)\s+([0-9,.]+)\s*\(?(Dr|Cr)\)?\s+([0-9,.]+)/gi,

    // UPI transaction pattern (enhanced)
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(?:UPI[-\s])?([^.]*?)(?:UPI[-\s])?\s+(?:Rs\.?|₹)?(\d+\.\d{2}|\d+,\d{3}\.\d{2})/i,

    // Card/POS transaction pattern
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(?:POS|ATM|CARD)\s+([^.]*?)\s+(?:Rs\.?|₹)?(\d+\.\d{2}|\d+,\d{3}\.\d{2})/i,

    // NEFT/IMPS/RTGS pattern
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(?:NEFT|IMPS|RTGS)\s+([^.]*?)\s+(?:Rs\.?|₹)?(\d+\.\d{2}|\d+,\d{3}\.\d{2})/i,

    // Amount with CR/DR indicator
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+([^.]*?)\s+(?:Rs\.?|₹)?(\d+\.\d{2}|\d+,\d{3}\.\d{2})\s*(?:CR|DR|Cr|Dr)/i,

    // General format for bank statements
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+([A-Za-z0-9\s.,-_:]+?)\s+(?:Rs\.?|₹)?(\d+\.\d{2}|\d+,\d{3}\.\d{2})/i,

    // More flexible pattern for OCR results
    /(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\s+([A-Za-z0-9\s\.@,-_:]+)\s+([0-9,.]+)/i
  ];

  // Split text into lines and process each line
  const lines = text.split('\n');

  console.log(`Processing ${lines.length} lines of text for transaction extraction`);

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Try each pattern until we find a match
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          // Handle different match group structures based on pattern
          let dateStr: string, description: string, amountStr: string, drCrIndicator: string | undefined;

          if (match.length >= 6) {
            // Kotak format with reference number: [full, date, desc, ref, amount, dr/cr, balance]
            const [, date, desc, , amount, drCr] = match;
            dateStr = date;
            description = desc;
            amountStr = amount;
            drCrIndicator = drCr;
          } else if (match.length >= 5) {
            // Kotak format without ref: [full, date, desc, amount, dr/cr, balance] or [full, date, desc, amount, dr/cr]
            const [, date, desc, amount, drCr] = match;
            dateStr = date;
            description = desc;
            amountStr = amount;
            drCrIndicator = drCr;
          } else {
            // Standard format: [full, date, desc, amount]
            const [, date, desc, amount] = match;
            dateStr = date;
            description = desc;
            amountStr = amount;
          }

          console.log(`Found potential transaction: Date=${dateStr}, Description=${description}, Amount=${amountStr}, Dr/Cr=${drCrIndicator || 'N/A'}`);

          // Clean up the date string
          dateStr = dateStr.replace(/[/-]/g, '/'); // Normalize separators to '/'

          // Parse the date, trying different formats
          let timestamp: number;
          try {
            // Try DD/MM/YYYY format
            timestamp = parse(dateStr, 'dd/MM/yyyy', new Date()).getTime();
          } catch {
            try {
              // Try DD/MM/YY format
              timestamp = parse(dateStr, 'dd/MM/yy', new Date()).getTime();
            } catch {
              try {
                // Try MM/DD/YYYY format (for US-style dates)
                timestamp = parse(dateStr, 'MM/dd/yyyy', new Date()).getTime();
              } catch {
                // Skip if date parsing fails
                console.warn(`Failed to parse date: ${dateStr}`);
                continue;
              }
            }
          }

          // Clean up the amount string
          amountStr = amountStr.replace(/[,\s₹Rs.]/g, '');
          let amount = parseFloat(amountStr);

          if (isNaN(amount)) {
            console.warn(`Failed to parse amount: ${amountStr}`);
            continue;
          }

          // Determine if it's credit or debit - prioritize explicit Dr/Cr indicator
          let isDebit = false;
          let isCredit = false;

          if (drCrIndicator) {
            // Use explicit Dr/Cr indicator from Kotak format
            isDebit = drCrIndicator.toLowerCase() === 'dr';
            isCredit = drCrIndicator.toLowerCase() === 'cr';
          } else {
            // Fall back to text context analysis
            isDebit = line.toLowerCase().includes('dr') ||
                      line.toLowerCase().includes('debit') ||
                      line.toLowerCase().includes('withdrawal') ||
                      line.toLowerCase().includes('paid') ||
                      line.toLowerCase().includes('purchase');

            isCredit = line.toLowerCase().includes('cr') ||
                       line.toLowerCase().includes('credit') ||
                       line.toLowerCase().includes('received') ||
                       line.toLowerCase().includes('refund');
          }

          if (isDebit) {
            amount = -Math.abs(amount); // Make sure it's negative for debit
          } else if (isCredit) {
            amount = Math.abs(amount); // Ensure it's positive for credit
          }

          // Determine transaction mode
          let transactionMode = 'BANK_TRANSFER';
          if (line.toLowerCase().includes('upi')) {
            transactionMode = 'UPI';
          } else if (line.toLowerCase().includes('neft')) {
            transactionMode = 'NEFT';
          } else if (line.toLowerCase().includes('imps')) {
            transactionMode = 'IMPS';
          } else if (line.toLowerCase().includes('rtgs')) {
            transactionMode = 'RTGS';
          } else if (line.toLowerCase().includes('atm')) {
            transactionMode = 'ATM';
          } else if (line.toLowerCase().includes('pos') || line.toLowerCase().includes('card')) {
            transactionMode = 'POS';
          } else if (line.toLowerCase().includes('cash')) {
            transactionMode = 'CASH';
          } else if (line.toLowerCase().includes('cheque') || line.toLowerCase().includes('chq')) {
            transactionMode = 'CHEQUE';
          }

          // Extract UPI ID if present (common pattern: xxx@xxx)
          const upiMatch = line.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+)/i);
          const upiId = upiMatch ? upiMatch[1] : undefined;

          // Extract account number if present (common patterns)
          const accountMatch = line.match(/A\/c\s*:?\s*(\d+)/i) ||
                              line.match(/Account\s*:?\s*(\d+)/i) ||
                              line.match(/Acct\s*:?\s*(\d+)/i);
          const accountNumber = accountMatch ? accountMatch[1] : undefined;

          // Clean up description
          description = description.trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\w\s@.,_-]/g, '') // Remove special characters except those common in identifiers
            .substring(0, 100); // Limit length to avoid excessively long descriptions

          console.log(`Processed transaction: ${description}, ${amount}, ${format(timestamp, 'dd/MM/yyyy')}`);

          transactions.push({
            merchantName: description,
            amount,
            timestamp,
            transactionMode,
            ...(upiId && { upiId }),
            ...(accountNumber && { accountNumber })
          });

          // Break the pattern loop once we've found a match
          break;
        } catch (error) {
          console.error('Error processing transaction:', error);
          continue;
        }
      }
    }
  }

  console.log(`Found ${transactions.length} transactions`);

  // Sort transactions by date
  return transactions.sort((a, b) => a.timestamp - b.timestamp);
}