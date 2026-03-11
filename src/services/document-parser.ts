import type { DocumentFormat } from '@/types/rag'

export async function parseDocument(
  file: File,
  format: DocumentFormat,
): Promise<string> {
  switch (format) {
    case 'pdf':
      return parsePdf(file)
    case 'docx':
      return parseDocx(file)
    case 'csv':
      return parseCsv(file)
    case 'txt':
    case 'md':
      return file.text()
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

async function parsePdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')

  // Set worker source — use bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(pageText)
  }

  return pages.join('\n\n')
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

async function parseCsv(file: File): Promise<string> {
  const Papa = await import('papaparse')
  const text = await file.text()

  return new Promise((resolve, reject) => {
    Papa.default.parse(text, {
      header: true,
      complete(results) {
        // Convert each row to a readable text block
        const rows = (results.data as Record<string, unknown>[])
          .filter((row) => Object.values(row).some((v) => v !== '' && v != null))
          .map((row, i) => {
            const fields = Object.entries(row)
              .map(([key, val]) => `${key}: ${val}`)
              .join(', ')
            return `Row ${i + 1}: ${fields}`
          })
        resolve(rows.join('\n'))
      },
      error(err: Error) {
        reject(err)
      },
    })
  })
}

export function detectFormat(filename: string): DocumentFormat | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf': return 'pdf'
    case 'docx': return 'docx'
    case 'txt': return 'txt'
    case 'md': return 'md'
    case 'csv': return 'csv'
    default: return null
  }
}
