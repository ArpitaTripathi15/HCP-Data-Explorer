import type { HcpRecord } from '../provided/data-generator'
import type { AggregateStats } from '../utils/aggregates'

export type GroupKey = string

export function regionKey(region: string): GroupKey {
  return `region:${region}`
}

export function territoryKey(region: string, territory: string): GroupKey {
  return `territory:${region}|${territory}`
}

export interface TerritoryGroup {
  key: GroupKey
  region: string
  territory: string
  /** Source-array indices — stable row identity for this dataset. */
  rowIndices: number[]
  aggregates: AggregateStats
}

export interface RegionGroup {
  key: GroupKey
  region: string
  territories: TerritoryGroup[]
  aggregates: AggregateStats
}

export interface GroupedTree {
  regions: RegionGroup[]
  /** Total leaf HCPs in the tree (after any future filter). */
  totalRows: number
}

/** Flat list fed to the virtualizer — only expanded branches appear. */
export type FlatRow =
  | {
      kind: 'region'
      key: GroupKey
      region: string
      aggregates: AggregateStats
      expanded: boolean
    }
  | {
      kind: 'territory'
      key: GroupKey
      region: string
      territory: string
      aggregates: AggregateStats
      expanded: boolean
      /** Leaf indices in this territory (for per-territory selection). */
      rowIndices: number[]
    }
  | {
      kind: 'hcp'
      /** Source-array index (canonical identity). */
      rowIndex: number
      row: HcpRecord
    }
