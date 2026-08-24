import type { HcpRecord } from '../provided/data-generator'
import type { FlatRow, GroupedTree, GroupKey } from './types'

/**
 * Flatten the group tree into virtualizer rows based on collapsed keys.
 * Default: everything expanded (collapsed set empty).
 */
export function flattenVisibleRows(
  tree: GroupedTree,
  rows: HcpRecord[],
  collapsed: ReadonlySet<GroupKey>,
): FlatRow[] {
  const flat: FlatRow[] = []

  for (const region of tree.regions) {
    const regionExpanded = !collapsed.has(region.key)
    flat.push({
      kind: 'region',
      key: region.key,
      region: region.region,
      aggregates: region.aggregates,
      expanded: regionExpanded,
    })

    if (!regionExpanded) continue

    for (const territory of region.territories) {
      const territoryExpanded = !collapsed.has(territory.key)
      flat.push({
        kind: 'territory',
        key: territory.key,
        region: territory.region,
        territory: territory.territory,
        aggregates: territory.aggregates,
        expanded: territoryExpanded,
        rowIndices: territory.rowIndices,
      })

      if (!territoryExpanded) continue

      for (const rowIndex of territory.rowIndices) {
        flat.push({
          kind: 'hcp',
          rowIndex,
          row: rows[rowIndex],
        })
      }
    }
  }

  return flat
}

/** All group keys in the tree (for expand/collapse all). */
export function allGroupKeys(tree: GroupedTree): GroupKey[] {
  const keys: GroupKey[] = []
  for (const region of tree.regions) {
    keys.push(region.key)
    for (const territory of region.territories) {
      keys.push(territory.key)
    }
  }
  return keys
}
