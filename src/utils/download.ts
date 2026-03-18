/**
 * Shared download utilities for exporting data from LLMxRay.
 */

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJson(data: unknown, filename: string): void {
  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json')
}

export function downloadCsv(headers: string[], rows: string[][], filename: string): void {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ]
  downloadFile(lines.join('\n'), filename, 'text/csv')
}

export function downloadMarkdown(content: string, filename: string): void {
  downloadFile(content, filename, 'text/markdown')
}
