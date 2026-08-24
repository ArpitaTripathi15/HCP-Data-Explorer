/** Parse calls field (number | string) to a numeric value for math; NaN if unparseable. */
export function parseCallsValue(calls: number | string): number {
  if (typeof calls === 'number') return calls
  const parsed = Number(calls)
  return Number.isFinite(parsed) ? parsed : NaN
}

/** Display calls as stored — preserve string form when the generator emitted one. */
export function formatCallsDisplay(calls: number | string): string {
  return String(calls)
}

/** Whether calls can be coerced to a finite number (for sorting / aggregation). */
export function isNumericCalls(calls: number | string): boolean {
  return Number.isFinite(parseCallsValue(calls))
}
