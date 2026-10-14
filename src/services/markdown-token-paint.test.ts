import { describe, it, expect } from 'vitest'
import { Marked } from 'marked'
import { paintTokens, visibleTokens } from './markdown-token-paint'

const marked = new Marked({ breaks: true, gfm: true })

function tok(text: string, color: string) {
  return { text, color }
}

/** Every painted span, as [text, colour], in document order. */
function spans(html: string): Array<[string, string]> {
  const div = document.createElement('div')
  div.innerHTML = html
  return Array.from(div.querySelectorAll('span[data-tok]')).map((el) => [
    el.textContent ?? '',
    (el as HTMLElement).style.borderBottom.replace('2px solid ', ''),
  ])
}

describe('paintTokens', () => {
  it('colours rendered text by the token it came from, through markdown syntax', () => {
    const tokens = [tok('**State', 'red'), tok(' Memory', 'green'), tok(':** stores', 'blue'), tok(' keys.', 'red')]
    const html = marked.parse(tokens.map((t) => t.text).join('')) as string
    const painted = paintTokens(html, tokens)

    expect(painted).toContain('<strong>')
    expect(spans(painted)).toEqual([
      ['State', 'red'],
      [' Memory', 'green'],
      [':', 'blue'],
      [' stores', 'blue'],
      [' keys.', 'red'],
    ])
    const div = document.createElement('div')
    div.innerHTML = painted
    expect(div.textContent?.trim()).toBe('State Memory: stores keys.')
  })

  it('keeps headings, lists and inline code aligned', () => {
    const tokens = [tok('### What', 'red'), tok(' it is\n', 'green'), tok('- use `', 'blue'), tok('cache`', 'black'), tok(' now', 'white')]
    const html = marked.parse(tokens.map((t) => t.text).join('')) as string
    const painted = paintTokens(html, tokens)
    const got = spans(painted)
    expect(got).toContainEqual(['What', 'red'])
    expect(got).toContainEqual(['use ', 'blue'])
    expect(got).toContainEqual(['cache', 'black'])
    expect(got).toContainEqual([' now', 'white'])
    expect(painted).toContain('<code>')
    expect(painted).toContain('<h3>')
  })

  it('leaves text it cannot place unpainted instead of mis-painting it', () => {
    const tokens = [tok('see [docs](https://example.com/a/very/long/path) here', 'red')]
    const html = marked.parse(tokens[0]!.text) as string
    const painted = paintTokens(html, tokens)
    const div = document.createElement('div')
    div.innerHTML = painted
    expect(div.textContent?.trim()).toBe('see docs here')
    expect(div.querySelector('a')?.getAttribute('href')).toBe('https://example.com/a/very/long/path')
    // "docs" and "see " are painted; nothing is painted with a colour it does not have
    for (const [, colour] of spans(painted)) expect(colour).toBe('red')
  })

  it('returns the html untouched when there are no tokens', () => {
    expect(paintTokens('<p>hi</p>', [])).toBe('<p>hi</p>')
  })
})

describe('visibleTokens', () => {
  it('drops think blocks, including a tag split across tokens', () => {
    const tokens = [tok('Hello <th', ''), tok('ink>secret', ''), tok(' stuff</think>', ''), tok(' world', '')]
    expect(visibleTokens(tokens).map((t) => t.text)).toEqual(['Hello ', ' world'])
  })

  it('keeps tokens untouched when there is nothing to hide', () => {
    const tokens = [tok('a', ''), tok('b', '')]
    const out = visibleTokens(tokens)
    expect(out[0]).toBe(tokens[0])
    expect(out[1]).toBe(tokens[1])
  })
})
