function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1])
    }
    prev = cur
  }
  return prev[n]
}

const DIACRITICS_RE = /[̀-ͯ]/g

export function normalize(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase().trim()
}

// Word-level typo tolerance, scaled to word length (~1 edit per 3 chars, min 1).
// Deliberately word-scoped (not a whole-text sliding window) — comparing a short
// query against arbitrary substrings of a long string produces coincidental
// matches (e.g. "alfa" ~ "alcami" by chance) that mean nothing to a user.
function maxDistFor(a: string, b: string): number {
  const shorter = Math.min(a.length, b.length)
  const longer = Math.max(a.length, b.length)
  if (shorter <= 3) return 0
  // Same-length short words require an exact match — a single substitution
  // turns one real word into a different real word (e.g. "nike" vs "bike"),
  // which is a coincidence, not a typo. Length changes (missing/extra letter)
  // are much more likely to be genuine typos, so those stay tolerant.
  if (longer <= 5 && shorter === longer) return 0
  return Math.max(1, Math.round(longer * 0.34))
}

/** true if `text` contains `query` exactly, or approximately (typo-tolerant). */
export function fuzzyMatch(text: string, query: string): boolean {
  const t = normalize(text)
  const q = normalize(query)
  if (!q) return false
  if (t.includes(q)) return true

  const words = t.split(/\s+/)
  for (const w of words) {
    const maxDist = maxDistFor(w, q)
    if (maxDist === 0) continue
    if (Math.abs(w.length - q.length) > maxDist) continue
    if (levenshtein(w, q) <= maxDist) return true
  }
  return false
}

/** lower = closer match; used to rank results, best first. */
export function fuzzyScore(text: string, query: string): number {
  const t = normalize(text)
  const q = normalize(query)
  const idx = t.indexOf(q)
  if (idx === 0) return -1000
  if (idx > 0) return -500 + idx
  const words = t.split(/\s+/)
  return Math.min(...words.map(w => levenshtein(w, q)), levenshtein(t, q))
}
