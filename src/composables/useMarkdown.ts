import { Marked } from 'marked'

const marked = new Marked({
  breaks: true,
  gfm: true,
})

export function renderMarkdown(text: string): string {
  if (!text) return ''
  return marked.parse(text) as string
}
