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

/** One row change inside a command. */
export interface CallsChange {
  rowIndex: number
  before: number | string
  after: number
}

/** Command history entries — single cell or bulk (exactly one undo step). */
export type EditCommand =
  | ({ kind: 'single' } & CallsChange)
  | { kind: 'bulk'; changes: CallsChange[] }

export interface BulkEditResult {
  applied: number
  rejected: Array<{ rowIndex: number; message: string }>
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

/** +10% Calls, rounded to nearest integer. */
export function bumpCallsTenPercent(calls: number | string): number | null {
  const n = typeof calls === 'number' ? calls : Number(calls)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 1.1)
}

/** Row indices touched by an undo/redo command. */
export function getCommandRowIndices(cmd: EditCommand): number[] {
  if (cmd.kind === 'single') return [cmd.rowIndex]
  return cmd.changes.map((c) => c.rowIndex)
}

export interface UndoRedoOutcome {
  action: 'undo' | 'redo'
  command: EditCommand
  /** Indices whose committed Calls were changed. */
  affectedIndices: number[]
  /** Affected rows not in the current search/region filter. */
  hiddenIndices: number[]
}
