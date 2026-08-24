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
 * Build Region → Territory tree from a subset of source indices.
 * Aggregates reflect only included rows (post search/filter).
 * Default order: alphabetical region / territory; leaf order = index order.
 */
export function buildGroupedTree(
  rows: HcpRecord[],
  indices?: readonly number[],
): GroupedTree {
  const regionMap = new Map<string, Map<string, number[]>>()
  const list = indices ?? (() => {
    const all = new Array<number>(rows.length)
    for (let i = 0; i < rows.length; i++) all[i] = i
    return all
  })()

  for (const i of list) {
    const row = rows[i]
    let territoryMap = regionMap.get(row.region)
    if (!territoryMap) {
      territoryMap = new Map()
      regionMap.set(row.region, territoryMap)
    }
    let bucket = territoryMap.get(row.territory)
    if (!bucket) {
      bucket = []
      territoryMap.set(row.territory, bucket)
    }
    bucket.push(i)
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

  return { regions, totalRows: list.length }
}
