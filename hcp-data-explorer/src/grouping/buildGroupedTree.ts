import type { HcpRecord } from '../provided/data-generator'
import {
  accumulateRow,
  emptyAggregates,
  mergeAggregates,
  type AggregateStats,
} from '../utils/aggregates'
import {
  regionKey,
  territoryKey,
  type GroupedTree,
  type RegionGroup,
  type TerritoryGroup,
} from './types'

/**
 * Build Region → Territory tree once per dataset (or after committed edits change
 * values used in aggregates). Regions and territories are sorted alphabetically
 * for a stable default order (FR-3 will reorder by aggregate when sorting).
 */
export function buildGroupedTree(rows: HcpRecord[]): GroupedTree {
  // region -> territory -> row indices
  const regionMap = new Map<string, Map<string, number[]>>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    let territoryMap = regionMap.get(row.region)
    if (!territoryMap) {
      territoryMap = new Map()
      regionMap.set(row.region, territoryMap)
    }
    let indices = territoryMap.get(row.territory)
    if (!indices) {
      indices = []
      territoryMap.set(row.territory, indices)
    }
    indices.push(i)
  }

  const regions: RegionGroup[] = []

  const regionNames = [...regionMap.keys()].sort((a, b) => a.localeCompare(b))
  for (const region of regionNames) {
    const territoryMap = regionMap.get(region)!
    const territoryNames = [...territoryMap.keys()].sort((a, b) => a.localeCompare(b))
    const territories: TerritoryGroup[] = []
    const regionAgg = emptyAggregates()

    for (const territory of territoryNames) {
      const rowIndices = territoryMap.get(territory)!
      const aggregates: AggregateStats = emptyAggregates()
      for (const idx of rowIndices) {
        accumulateRow(aggregates, rows[idx])
      }
      mergeAggregates(regionAgg, aggregates)
      territories.push({
        key: territoryKey(region, territory),
        region,
        territory,
        rowIndices,
        aggregates,
      })
    }

    regions.push({
      key: regionKey(region),
      region,
      territories,
      aggregates: regionAgg,
    })
  }

  return { regions, totalRows: rows.length }
}
