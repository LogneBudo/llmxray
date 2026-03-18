import { franc } from 'franc-min'

const ISO3_TO_ISO2: Record<string, string> = {
  eng: 'en', fra: 'fr', arb: 'ar', zho: 'zh', cmn: 'zh',
  jpn: 'ja', heb: 'he', deu: 'de', spa: 'es',
  por: 'pt', ita: 'it', rus: 'ru', kor: 'ko',
  hin: 'hi', tur: 'tr', nld: 'nl', pol: 'pl',
  swe: 'sv', dan: 'da', nor: 'no', fin: 'fi',
  tha: 'th', vie: 'vi', ind: 'id', msa: 'ms',
}

export function detectLanguage(text: string): string | null {
  if (text.trim().length < 20) return null
  const iso3 = franc(text)
  return iso3 === 'und' ? null : (ISO3_TO_ISO2[iso3] ?? null)
}
