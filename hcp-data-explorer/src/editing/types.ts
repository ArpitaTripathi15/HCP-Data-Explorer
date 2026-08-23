import type { HcpRecord } from '../provided/data-generator'

/** Per-cell edit lifecycle for Calls (FR-4). */
export type CallsCellStatus = 'idle' | 'editing' | 'pending' | 'rejected'

export interface CallsCellState {
  status: CallsCellStatus
  /** Value shown while editing or pending validation. */
  draftValue?: number
  /** Rejection reason from validateCalls (string). */
  error?: string
}

/** Single-cell edit command for undo/redo (not a data snapshot). */
export interface CallsEditCommand {
  rowIndex: number
  /** Previous committed Calls (original union type preserved when no prior edit). */
  before: number | string
  /** Accepted numeric Calls after validation. */
  after: number
}

export type CommittedCallsMap = ReadonlyMap<number, number>

/** Committed Calls for aggregates/sort — pending excluded. */
export function getCommittedCalls(
  rowIndex: number,
  original: HcpRecord,
  committed: CommittedCallsMap,
): number | string {
  const override = committed.get(rowIndex)
  return override !== undefined ? override : original.calls
}

/** Display Calls: pending draft if validating, else committed. */
export function getDisplayCalls(
  rowIndex: number,
  original: HcpRecord,
  committed: CommittedCallsMap,
  cell: CallsCellState | undefined,
): number | string {
  if (cell?.status === 'pending' && cell.draftValue !== undefined) {
    return cell.draftValue
  }
  if (cell?.status === 'editing' && cell.draftValue !== undefined) {
    return cell.draftValue
  }
  return getCommittedCalls(rowIndex, original, committed)
}
