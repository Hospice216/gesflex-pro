export function normalizeForSearch(value: any): string {
  return value ? String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : ''
}

export function tokenize(query: string): string[] {
  return normalizeForSearch(query).split(/\s+/).filter(Boolean)
}

export function matchesAllTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  return tokens.every(t => haystack.includes(t))
}

export function buildHaystack(fields: Array<any>): string {
  return normalizeForSearch(fields.filter(Boolean).join(' '))
}




