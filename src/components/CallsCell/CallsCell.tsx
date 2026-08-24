import { useEffect, useRef, useState } from 'react'
import type { CallsCellState } from '../../editing/types'
import { formatCallsDisplay } from '../../utils/calls'
import './CallsCell.css'

interface CallsCellProps {
  rowIndex: number
  committedCalls: number | string
  cell: CallsCellState | undefined
  onBeginEdit: (rowIndex: number) => boolean
  onDraftChange: (rowIndex: number, raw: string) => void
  onCommit: (rowIndex: number, value?: number) => void
  onCancel: (rowIndex: number) => void
}

export function CallsCell({
  rowIndex,
  committedCalls,
  cell,
  onBeginEdit,
  onDraftChange,
  onCommit,
  onCancel,
}: CallsCellProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localText, setLocalText] = useState('')
  const committingRef = useRef(false)

  const status = cell?.status ?? 'idle'
  const isEditing = status === 'editing'
  const isPending = status === 'pending'
  const isRejected = status === 'rejected'

  useEffect(() => {
    if (!isEditing) return
    setLocalText(cell?.draftValue !== undefined ? String(cell.draftValue) : '')
    committingRef.current = false
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [isEditing, rowIndex]) // eslint-disable-line react-hooks/exhaustive-deps -- only on enter edit

  if (isEditing) {
    return (
      <div className="calls-cell calls-cell--editing" role="gridcell">
        <input
          ref={inputRef}
          className="calls-cell__input"
          type="number"
          inputMode="numeric"
          value={localText}
          aria-label={`Edit calls for row ${rowIndex}`}
          onChange={(e) => {
            setLocalText(e.target.value)
            onDraftChange(rowIndex, e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              committingRef.current = true
              const n = Number(localText)
              onCommit(rowIndex, Number.isFinite(n) ? n : undefined)
            } else if (e.key === 'Escape') {
              e.preventDefault()
              committingRef.current = true
              onCancel(rowIndex)
            }
          }}
          onBlur={() => {
            if (committingRef.current) return
            committingRef.current = true
            const n = Number(localText)
            onCommit(rowIndex, Number.isFinite(n) ? n : undefined)
          }}
        />
      </div>
    )
  }

  const display =
    isPending && cell?.draftValue !== undefined
      ? cell.draftValue
      : committedCalls

  const className = [
    'calls-cell',
    'virtual-grid__cell',
    'virtual-grid__cell--right',
    isPending ? 'calls-cell--pending' : '',
    isRejected ? 'calls-cell--rejected' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      role="gridcell"
      title={isRejected && cell?.error ? cell.error : undefined}
    >
      <button
        type="button"
        className="calls-cell__btn"
        disabled={isPending}
        onClick={() => {
          if (!isPending) onBeginEdit(rowIndex)
        }}
        aria-label={
          isPending
            ? `Calls ${formatCallsDisplay(display)}, validating`
            : `Edit calls ${formatCallsDisplay(display)}`
        }
      >
        {formatCallsDisplay(display)}
        {isPending ? (
          <span className="calls-cell__spinner" aria-hidden="true" />
        ) : null}
      </button>
    </div>
  )
}
