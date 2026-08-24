import { parseCallsValue } from './calls'
import { formatCpi } from './cpi'
import type { HcpRecord } from '../provided/data-generator'

/** Live subtotals for a region or territory group header. */
export interface AggregateStats {
  sumCalls: number
  sumTrx: number
  sumNrx: number
  hcpCount: number
}

export function emptyAggregates(): AggregateStats {
  return { sumCalls: 0, sumTrx: 0, sumNrx: 0, hcpCount: 0 }
}

/**
 * Fold one HCP into aggregates.
 * - `calls` strings are coerced via Number(); non-finite values contribute 0 to Σ Calls.
 * - Outliers (e.g. 99999) are included as stored — not sanitized.
 */
export function accumulateRow(stats: AggregateStats, row: HcpRecord): void {
  const callsNum = parseCallsValue(row.calls)
  stats.sumCalls += Number.isFinite(callsNum) ? callsNum : 0
  stats.sumTrx += row.trx
  stats.sumNrx += row.nrx
  stats.hcpCount += 1
}

export function mergeAggregates(into: AggregateStats, from: AggregateStats): void {
  into.sumCalls += from.sumCalls
  into.sumTrx += from.sumTrx
  into.sumNrx += from.sumNrx
  into.hcpCount += from.hcpCount
}

/** Aggregate CPI = Σ Calls ÷ Σ TRx × 100. Null when Σ TRx is 0. */
export function aggregateCpi(stats: AggregateStats): number | null {
  if (stats.sumTrx === 0) return null
  const cpi = (stats.sumCalls / stats.sumTrx) * 100
  return Number.isFinite(cpi) ? cpi : null
}

export function formatAggregateCalls(stats: AggregateStats): string {
  return stats.sumCalls.toLocaleString()
}

export function formatAggregateNumber(n: number): string {
  return n.toLocaleString()
}

export function formatAggregateCpi(stats: AggregateStats): string {
  return formatCpi(aggregateCpi(stats))
}
