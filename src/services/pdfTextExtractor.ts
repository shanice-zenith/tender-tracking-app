import * as pdfjsLib from 'pdfjs-dist';

// Configure worker URL for browser environments
if (typeof window !== 'undefined') {
  try {
    // Set CDN worker fallback
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Could not set pdfjs workerSrc:', e);
  }
}

/**
 * Extracts raw plain text from a PDF ArrayBuffer.
 * Uses pdfjs-dist as primary extractor, with a resilient pure-JS fallback
 * for sandboxed or offline environments.
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  // Method 1: Use PDF.js
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const pageTexts: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      
      let lastY: number | null = null;
      let pageStr = '';

      for (const item of textContent.items as any[]) {
        if ('str' in item) {
          const currentY = item.transform ? Math.round(item.transform[5]) : null;
          // If Y position changed significantly, add a newline
          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
            pageStr += '\n';
          } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
            pageStr += ' ';
          }
          pageStr += item.str;
          lastY = currentY;
        }
      }
      pageTexts.push(pageStr);
    }

    const fullText = pageTexts.join('\n\n');
    if (fullText.trim().length > 20) {
      return fullText;
    }
  } catch (primaryErr) {
    console.warn('PDF.js text extraction error, falling back to raw stream parsing:', primaryErr);
  }

  // Method 2: Resilient pure-JS PDF stream / text token fallback
  try {
    return extractTextFromRawPdfBuffer(arrayBuffer);
  } catch (fallbackErr) {
    console.error('Fallback PDF parser failed:', fallbackErr);
    throw new Error('Could not parse text from this PDF file. Please ensure the PDF contains readable text or upload a CSV format.');
  }
}

/**
 * Resilient pure-JS scanner for PDF binary data.
 * Scans for text in parentheses `(text) Tj` or brackets `[(t)(e)(x)(t)] TJ` and uncompressed streams.
 */
export function extractTextFromRawPdfBuffer(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let rawStr = '';
  // Convert printable ASCII characters
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    const b = bytes[i];
    if (b === 10 || b === 13 || (b >= 32 && b <= 126)) {
      rawStr += String.fromCharCode(b);
    } else {
      rawStr += ' ';
    }
  }

  const lines: string[] = [];

  // Match (text) Tj
  const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
  let match: RegExpExecArray | null;
  let currentLine = '';

  while ((match = tjRegex.exec(rawStr)) !== null) {
    const textChunk = match[1].replace(/\\([()\\])/g, '$1');
    currentLine += textChunk + ' ';
    if (currentLine.length > 120 || match[0].includes('"') || match[0].includes("'")) {
      lines.push(currentLine.trim());
      currentLine = '';
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  // Also extract text inside array TJ: [ (text) -120 (more) ] TJ
  const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(rawStr)) !== null) {
    const inner = match[1];
    const chunks = inner.match(/\(([^)]+)\)/g);
    if (chunks && chunks.length > 0) {
      const lineText = chunks.map((c) => c.slice(1, -1).replace(/\\([()\\])/g, '$1')).join('');
      if (lineText.trim()) {
        lines.push(lineText.trim());
      }
    }
  }

  // If we collected structured text lines
  if (lines.length > 0) {
    return lines.join('\n');
  }

  // Ultimate fallback: return the raw sanitized ASCII stream
  return rawStr;
}
