import type { HcpRecord } from '../provided/data-generator'
import { regionKey, territoryKey } from './types'

/** Expand region + territory ancestors so leaf rows become visible in the flat list. */
export function ancestorKeysForRow(row: HcpRecord): [string, string] {
  return [regionKey(row.region), territoryKey(row.region, row.territory)]
}

export function ancestorKeysForRows(
  rows: HcpRecord[],
  indices: readonly number[],
): string[] {
  const keys = new Set<string>()
  for (const i of indices) {
    const [r, t] = ancestorKeysForRow(rows[i])
    keys.add(r)
    keys.add(t)
  }
  return [...keys]
}
