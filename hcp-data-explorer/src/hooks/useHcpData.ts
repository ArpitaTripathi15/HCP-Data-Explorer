import { useMemo } from 'react'
import { generateRows, type HcpRecord } from '../provided/data-generator'

export interface HcpDataState {
  rows: HcpRecord[]
  loadTimeMs: number
}

/** Stable row identity: array index, since HCP `id` is not unique in the dataset. */
export type RowIndex = number

export function useHcpData(): HcpDataState {
  return useMemo(() => {
    const start = performance.now()
    const rows = generateRows()
    const loadTimeMs = performance.now() - start
    return { rows, loadTimeMs }
  }, [])
}
