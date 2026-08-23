import type { HcpRecord } from '../provided/data-generator'

export interface RowFilter {
  /** Case-insensitive substring match on name or id. Empty = no search. */
  search: string
  /** Exact region match. Empty / null = all regions. */
  region: string | null
}

/**
 * Return source-array indices that pass search + region filter.
 * Search matches `name` or `id` (case-insensitive substring).
 */
export function filterRowIndices(rows: HcpRecord[], filter: RowFilter): number[] {
  const q = filter.search.trim().toLowerCase()
  const region = filter.region
  const hasSearch = q.length > 0
  const hasRegion = region !== null && region.length > 0

  if (!hasSearch && !hasRegion) {
    const all = new Array<number>(rows.length)
    for (let i = 0; i < rows.length; i++) all[i] = i
    return all
  }

  const out: number[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (hasRegion && row.region !== region) continue
    if (hasSearch) {
      const name = row.name.toLowerCase()
      const id = row.id.toLowerCase()
      if (!name.includes(q) && !id.includes(q)) continue
    }
    out.push(i)
  }
  return out
}

/** Distinct regions present in the dataset, sorted. */
export function listRegions(rows: HcpRecord[]): string[] {
  const set = new Set<string>()
  for (const row of rows) set.add(row.region)
  return [...set].sort((a, b) => a.localeCompare(b))
}
