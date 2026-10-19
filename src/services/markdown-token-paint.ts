/**
 * Paints per-token colour onto rendered Markdown.
 *
 * The chat shows a reply as it streams. Each token carries a confidence, and
 * the reader should see both the rendered Markdown and the colour of every
 * token under it. Markdown rendering drops the syntax characters (`**`, `#`,
 * backticks, link targets), so the rendered text is a subsequence of the
 * source. This module aligns the two: it walks the text nodes of the rendered
 * HTML, matches each character forward into the token source, and wraps every
 * run of characters that belong to one token in a span carrying that token's
 * colour. Characters it cannot place (a link target that markdown dropped, a
 * decoded entity) are left unpainted rather than mis-painted.
 */

export interface PaintableToken {
  text: string
  color: string
}

/** How far ahead in the source a rendered character may be found before it is given up on. */
const RESYNC_WINDOW = 240

const ATTR = 'data-tok'

/**
 * Returns `html` with every text run wrapped in `<span>`s coloured by the token
 * it came from. `html` is Markdown already rendered to HTML from the
 * concatenation of `tokens[].text`.
 */
export function paintTokens(html: string, tokens: ReadonlyArray<PaintableToken>): string {
  if (!html || tokens.length === 0 || typeof document === 'undefined') return html

  const source = tokens.map((t) => t.text).join('')
  const ownerOf = new Int32Array(source.length)
  let cursor = 0
  tokens.forEach((t, i) => {
    ownerOf.fill(i, cursor, cursor + t.text.length)
    cursor += t.text.length
  })

  const root = document.createElement('div')
  root.innerHTML = html

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) textNodes.push(n as Text)

  let p = 0
  for (const node of textNodes) {
    const text = node.data
    if (!text) continue
    const owners: number[] = new Array(text.length)
    for (let i = 0; i < text.length; i++) {
      const c = text[i]!
      if (/\s/.test(c)) {
        // Markdown collapses and invents whitespace; consume what the source has, never fail on it.
        // Syntax characters that markdown dropped (a closing backtick, `**`) may sit between the
        // cursor and the source's own whitespace: step over them so the space keeps its token.
        let q = p
        while (q < source.length && q - p < 4 && /[^\s\w]/.test(source[q]!)) q++
        if (q >= source.length || !/\s/.test(source[q]!)) q = p
        while (q < source.length && /\s/.test(source[q]!)) q++
        owners[i] = q > p ? ownerOf[q - 1]! : p < source.length ? ownerOf[p]! : -1
        p = q
        continue
      }
      const q = source.indexOf(c, p)
      if (q !== -1 && q - p <= RESYNC_WINDOW) {
        owners[i] = ownerOf[q]!
        p = q + 1
      } else {
        owners[i] = -1
      }
    }
    replaceWithPaintedRuns(node, text, owners, tokens)
  }

  return root.innerHTML
}

function replaceWithPaintedRuns(
  node: Text,
  text: string,
  owners: number[],
  tokens: ReadonlyArray<PaintableToken>,
): void {
  const frag = document.createDocumentFragment()
  let start = 0
  while (start < text.length) {
    let end = start + 1
    while (end < text.length && owners[end] === owners[start]) end++
    const run = text.slice(start, end)
    const owner = owners[start]!
    if (owner < 0) {
      frag.appendChild(document.createTextNode(run))
    } else {
      const span = document.createElement('span')
      span.setAttribute(ATTR, String(owner))
      // No colour means no underline: the token kept its span, and nothing is claimed about it.
      if (tokens[owner]!.color) span.style.borderBottom = `2px solid ${tokens[owner]!.color}`
      span.textContent = run
      frag.appendChild(span)
    }
    start = end
  }
  node.replaceWith(frag)
}

/**
 * The tokens a reader should see: everything outside `<think>…</think>`.
 * Tags may be split across tokens, so the stream is scanned as one string and
 * the visible ranges are mapped back; a token that straddles a tag boundary
 * keeps only its visible part.
 */
export function visibleTokens<T extends { text: string }>(tokens: ReadonlyArray<T>): T[] {
  const full = tokens.map((t) => t.text).join('')
  if (!full.includes('<think>')) return [...tokens]

  // Visible character ranges of `full`, as [start, end) pairs.
  const ranges: Array<[number, number]> = []
  let pos = 0
  while (pos < full.length) {
    const open = full.indexOf('<think>', pos)
    if (open === -1) {
      ranges.push([pos, full.length])
      break
    }
    if (open > pos) ranges.push([pos, open])
    const close = full.indexOf('</think>', open + '<think>'.length)
    if (close === -1) break // still thinking: nothing after the tag is visible yet
    pos = close + '</think>'.length
  }

  const result: T[] = []
  let offset = 0
  for (const token of tokens) {
    const tStart = offset
    const tEnd = offset + token.text.length
    offset = tEnd
    let visible = ''
    for (const [rs, re] of ranges) {
      const from = Math.max(rs, tStart)
      const to = Math.min(re, tEnd)
      if (from < to) visible += full.slice(from, to)
    }
    if (!visible) continue
    result.push(visible === token.text ? token : { ...token, text: visible })
  }
  return result
}
