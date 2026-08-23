import { useCallback, useMemo, useRef, useState } from 'react'
import type { HcpRecord } from '../provided/data-generator'
import { validateCalls } from '../provided/mock-validator'
import { parseCallsValue } from '../utils/calls'
import {
  getCommittedCalls,
  type CallsCellState,
  type CallsEditCommand,
  type CommittedCallsMap,
} from '../editing/types'

export interface UseCallsEditsResult {
  /** Rows with committed Calls overrides applied (pending excluded). */
  workingRows: HcpRecord[]
  committed: CommittedCallsMap
  getCellState: (rowIndex: number) => CallsCellState | undefined
  beginEdit: (rowIndex: number) => boolean
  setDraft: (rowIndex: number, raw: string) => void
  cancelEdit: (rowIndex: number) => void
  /** Commit draft; optional `value` takes precedence over stored draft. */
  commitEdit: (rowIndex: number, value?: number) => Promise<void>
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  lastRejection: { rowIndex: number; message: string } | null
  dismissRejection: () => void
}

/**
 * FR-4: async-validated Calls edits + command-history undo/redo.
 * Pending cells are locked. Undo/redo apply locally without re-validation.
 */
export function useCallsEdits(baseRows: HcpRecord[]): UseCallsEditsResult {
  const [committed, setCommitted] = useState<Map<number, number>>(() => new Map())
  const [cells, setCells] = useState<Map<number, CallsCellState>>(() => new Map())
  const [undoStack, setUndoStack] = useState<CallsEditCommand[]>([])
  const [redoStack, setRedoStack] = useState<CallsEditCommand[]>([])
  const [lastRejection, setLastRejection] = useState<{
    rowIndex: number
    message: string
  } | null>(null)

  /** Only mutated inside event handlers / async callbacks — never during render. */
  const requestTokenRef = useRef<Map<number, number>>(new Map())

  const workingRows = useMemo(() => {
    if (committed.size === 0) return baseRows
    return baseRows.map((row, i) => {
      const override = committed.get(i)
      return override === undefined ? row : { ...row, calls: override }
    })
  }, [baseRows, committed])

  const getCellState = useCallback(
    (rowIndex: number) => cells.get(rowIndex),
    [cells],
  )

  const beginEdit = useCallback(
    (rowIndex: number): boolean => {
      const existing = cells.get(rowIndex)
      if (existing?.status === 'pending') return false

      const current = getCommittedCalls(rowIndex, baseRows[rowIndex], committed)
      const parsed =
        typeof current === 'number' ? current : parseCallsValue(current)
      const draftValue = Number.isFinite(parsed) ? parsed : 0

      setCells((prev) => {
        const next = new Map(prev)
        next.set(rowIndex, { status: 'editing', draftValue })
        return next
      })
      return true
    },
    [baseRows, cells, committed],
  )

  const setDraft = useCallback((rowIndex: number, raw: string) => {
    const parsed = raw.trim() === '' ? NaN : Number(raw)
    setCells((prev) => {
      const cur = prev.get(rowIndex)
      if (!cur || cur.status !== 'editing') return prev
      const next = new Map(prev)
      next.set(rowIndex, {
        ...cur,
        draftValue: Number.isFinite(parsed) ? parsed : cur.draftValue,
        error: undefined,
      })
      return next
    })
  }, [])

  const cancelEdit = useCallback((rowIndex: number) => {
    setCells((prev) => {
      const cur = prev.get(rowIndex)
      if (!cur || cur.status === 'pending') return prev
      const next = new Map(prev)
      next.delete(rowIndex)
      return next
    })
  }, [])

  const commitEdit = useCallback(
    async (rowIndex: number, value?: number) => {
      const cell = cells.get(rowIndex)
      if (!cell || cell.status === 'pending') return
      if (cell.status !== 'editing') return

      const newValue = value ?? cell.draftValue
      if (newValue === undefined || !Number.isFinite(newValue)) {
        const message = 'Calls must be a finite number'
        setCells((prev) => {
          const next = new Map(prev)
          next.set(rowIndex, { status: 'rejected', error: message })
          return next
        })
        setLastRejection({ rowIndex, message })
        return
      }

      const before = getCommittedCalls(rowIndex, baseRows[rowIndex], committed)

      const beforeNum =
        typeof before === 'number' ? before : parseCallsValue(before)
      if (Number.isFinite(beforeNum) && beforeNum === newValue) {
        setCells((prev) => {
          const next = new Map(prev)
          next.delete(rowIndex)
          return next
        })
        return
      }

      const token = (requestTokenRef.current.get(rowIndex) ?? 0) + 1
      requestTokenRef.current.set(rowIndex, token)

      setCells((prev) => {
        const next = new Map(prev)
        next.set(rowIndex, { status: 'pending', draftValue: newValue })
        return next
      })

      try {
        await validateCalls(newValue)
        if (requestTokenRef.current.get(rowIndex) !== token) return

        setCommitted((prev) => {
          const next = new Map(prev)
          next.set(rowIndex, newValue)
          return next
        })
        setCells((prev) => {
          const next = new Map(prev)
          next.delete(rowIndex)
          return next
        })
        setUndoStack((prev) => [...prev, { rowIndex, before, after: newValue }])
        setRedoStack([])
      } catch (err) {
        if (requestTokenRef.current.get(rowIndex) !== token) return
        const message = typeof err === 'string' ? err : 'Validation failed'
        setCells((prev) => {
          const next = new Map(prev)
          next.set(rowIndex, { status: 'rejected', error: message })
          return next
        })
        setLastRejection({ rowIndex, message })
      }
    },
    [baseRows, cells, committed],
  )

  const applyCommittedValue = useCallback(
    (rowIndex: number, value: number | string) => {
      setCommitted((prev) => {
        const next = new Map(prev)
        const original = baseRows[rowIndex].calls
        if (value === original) {
          next.delete(rowIndex)
        } else if (typeof value === 'number') {
          next.set(rowIndex, value)
        } else {
          const n = parseCallsValue(value)
          if (
            Number.isFinite(n) &&
            n === Number(original) &&
            typeof original === 'string'
          ) {
            next.delete(rowIndex)
          } else if (Number.isFinite(n)) {
            next.set(rowIndex, n)
          } else {
            next.delete(rowIndex)
          }
        }
        return next
      })
      setCells((prev) => {
        if (!prev.has(rowIndex)) return prev
        const next = new Map(prev)
        next.delete(rowIndex)
        return next
      })
    },
    [baseRows],
  )

  const undo = useCallback(() => {
    if (undoStack.length === 0) return
    const cmd = undoStack[undoStack.length - 1]
    if (cells.get(cmd.rowIndex)?.status === 'pending') return

    applyCommittedValue(cmd.rowIndex, cmd.before)
    setUndoStack(undoStack.slice(0, -1))
    setRedoStack((r) => [...r, cmd])
  }, [undoStack, cells, applyCommittedValue])

  const redo = useCallback(() => {
    if (redoStack.length === 0) return
    const cmd = redoStack[redoStack.length - 1]
    if (cells.get(cmd.rowIndex)?.status === 'pending') return

    applyCommittedValue(cmd.rowIndex, cmd.after)
    setRedoStack(redoStack.slice(0, -1))
    setUndoStack((u) => [...u, cmd])
  }, [redoStack, cells, applyCommittedValue])

  const dismissRejection = useCallback(() => {
    setLastRejection(null)
    setCells((prev) => {
      let changed = false
      const next = new Map(prev)
      for (const [idx, cell] of next) {
        if (cell.status === 'rejected') {
          next.delete(idx)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [])

  return {
    workingRows,
    committed,
    getCellState,
    beginEdit,
    setDraft,
    cancelEdit,
    commitEdit,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    lastRejection,
    dismissRejection,
  }
}
