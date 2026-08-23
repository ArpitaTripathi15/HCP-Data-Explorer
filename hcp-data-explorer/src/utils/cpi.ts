import { parseCallsValue } from './calls'

/** CPI = Calls ÷ TRx × 100. Returns null when result would be NaN or Infinity. */
export function computeCpi(calls: number | string, trx: number): number | null {
  if (trx === 0) return null
  const callsNum = parseCallsValue(calls)
  if (!Number.isFinite(callsNum)) return null
  const cpi = (callsNum / trx) * 100
  return Number.isFinite(cpi) ? cpi : null
}

export function formatCpi(cpi: number | null): string {
  if (cpi === null) return '—'
  return cpi.toFixed(1)
}
