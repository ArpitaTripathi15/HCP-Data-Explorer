import type { HcpRecord } from '../provided/data-generator'
import { parseCallsValue } from '../utils/calls'
import { computeCpi } from '../utils/cpi'
import { aggregateCpi, type AggregateStats } from '../utils/aggregates'
import type { GroupedTree, RegionGroup, TerritoryGroup } from './types'

/** Columns that can drive sort (mirrors grid header keys). */
export type SortColumn =
  | 'id'
  | 'name'
  | 'specialty'
  | 'region'
  | 'territory'
  | 'calls'
  | 'trx'
  | 'nrx'
  | 'cpi'

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  column: SortColumn
  direction: SortDirection
}

const NUMERIC_COLUMNS = new Set<SortColumn>(['calls', 'trx', 'nrx', 'cpi'])

export function isNumericColumn(column: SortColumn): boolean {
  return NUMERIC_COLUMNS.has(column)
}

/** Cycle: none → asc → desc → none. Switching column starts at asc. */
export function nextSortState(
  current: SortState | null,
  column: SortColumn,
): SortState | null {
  if (!current || current.column !== column) {
    return { column, direction: 'asc' }
  }
  if (current.direction === 'asc') return { column, direction: 'desc' }
  return null
}

/**
 * Compare two leaf rows for a column.
 * Tie-break: lower source index first (stable within groups).
 * Null / non-comparable values always sort last (both asc and desc).
 */
export function compareRows(
  rows: HcpRecord[],
  aIdx: number,
  bIdx: number,
  column: SortColumn,
  direction: SortDirection,
): number {
  const mul = direction === 'asc' ? 1 : -1
  const a = rows[aIdx]
  const b = rows[bIdx]

  if (column === 'specialty') {
    const nullPos = nullsLast(a.specialty === null, b.specialty === null)
    if (nullPos !== 0) return nullPos
  }
  if (column === 'calls') {
    const aN = parseCallsValue(a.calls)
    const bN = parseCallsValue(b.calls)
    const nullPos = nullsLast(!Number.isFinite(aN), !Number.isFinite(bN))
    if (nullPos !== 0) return nullPos
  }
  if (column === 'cpi') {
    const aC = computeCpi(a.calls, a.trx)
    const bC = computeCpi(b.calls, b.trx)
    const nullPos = nullsLast(aC === null, bC === null)
    if (nullPos !== 0) return nullPos
  }

  const cmp = compareLeafValues(a, b, column)
  if (cmp !== 0) return cmp * mul
  return aIdx - bIdx
}

/** Positive if a should sort after b (nulls last). */
function nullsLast(aNull: boolean, bNull: boolean): number {
  if (aNull && bNull) return 0
  if (aNull) return 1
  if (bNull) return -1
  return 0
}

function compareLeafValues(a: HcpRecord, b: HcpRecord, column: SortColumn): number {
  switch (column) {
    case 'id':
      return a.id.localeCompare(b.id)
    case 'name':
      return a.name.localeCompare(b.name)
    case 'specialty': {
      // Both null already handled as equal by nullsLast; guard for safety.
      if (a.specialty === null || b.specialty === null) return 0
      return a.specialty.localeCompare(b.specialty)
    }
    case 'region':
      return a.region.localeCompare(b.region)
    case 'territory':
      return a.territory.localeCompare(b.territory)
    case 'calls': {
      const aN = parseCallsValue(a.calls)
      const bN = parseCallsValue(b.calls)
      if (!Number.isFinite(aN) || !Number.isFinite(bN)) return 0
      return aN - bN
    }
    case 'trx':
      return a.trx - b.trx
    case 'nrx':
      return a.nrx - b.nrx
    case 'cpi': {
      const aC = computeCpi(a.calls, a.trx)
      const bC = computeCpi(b.calls, b.trx)
      if (aC === null || bC === null) return 0
      return aC - bC
    }
    default:
      return 0
  }
}

function aggregateSortValue(stats: AggregateStats, column: SortColumn): number | null {
  switch (column) {
    case 'calls':
      return stats.sumCalls
    case 'trx':
      return stats.sumTrx
    case 'nrx':
      return stats.sumNrx
    case 'cpi':
      return aggregateCpi(stats)
    default:
      return null
  }
}

function compareAggregates(
  a: AggregateStats,
  b: AggregateStats,
  column: SortColumn,
  direction: SortDirection,
): number {
  const aVal = aggregateSortValue(a, column)
  const bVal = aggregateSortValue(b, column)
  const nullPos = nullsLast(
    aVal === null || !Number.isFinite(aVal),
    bVal === null || !Number.isFinite(bVal),
  )
  if (nullPos !== 0) return nullPos
  const mul = direction === 'asc' ? 1 : -1
  return ((aVal as number) - (bVal as number)) * mul
}

/**
 * Return a new tree with regions, territories, and leaf indices ordered per sort.
 * - Numeric columns: groups reorder by aggregate of that column.
 * - Text columns: groups reorder by label when sorting region/territory; otherwise
 *   group label order is alphabetical and leaves sort within each territory.
 */
export function applySortToTree(
  tree: GroupedTree,
  rows: HcpRecord[],
  sort: SortState | null,
): GroupedTree {
  if (!sort) {
    return {
      ...tree,
      regions: tree.regions.map((region) => ({
        ...region,
        territories: region.territories.map((t) => ({
          ...t,
          rowIndices: [...t.rowIndices],
        })),
      })),
    }
  }

  const { column, direction } = sort
  const numeric = isNumericColumn(column)

  const regions: RegionGroup[] = tree.regions.map((region) => {
    const territories: TerritoryGroup[] = region.territories.map((t) => {
      const rowIndices = [...t.rowIndices]
      rowIndices.sort((a, b) => compareRows(rows, a, b, column, direction))
      return { ...t, rowIndices }
    })

    if (numeric) {
      territories.sort((a, b) => {
        const c = compareAggregates(a.aggregates, b.aggregates, column, direction)
        if (c !== 0) return c
        return a.territory.localeCompare(b.territory)
      })
    } else if (column === 'territory' || column === 'region') {
      territories.sort((a, b) => {
        const c = a.territory.localeCompare(b.territory)
        return direction === 'asc' ? c : -c
      })
    } else {
      territories.sort((a, b) => a.territory.localeCompare(b.territory))
    }

    return { ...region, territories }
  })

  if (numeric) {
    regions.sort((a, b) => {
      const c = compareAggregates(a.aggregates, b.aggregates, column, direction)
      if (c !== 0) return c
      return a.region.localeCompare(b.region)
    })
  } else if (column === 'region') {
    regions.sort((a, b) => {
      const c = a.region.localeCompare(b.region)
      return direction === 'asc' ? c : -c
    })
  } else {
    regions.sort((a, b) => a.region.localeCompare(b.region))
  }

  return { regions, totalRows: tree.totalRows }
}
