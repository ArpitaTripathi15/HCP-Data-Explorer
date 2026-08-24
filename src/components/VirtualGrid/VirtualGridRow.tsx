import type { CSSProperties } from 'react'
import type { CallsCellState } from '../../editing/types'
import type { FlatRow, GroupKey } from '../../grouping/types'
import {
  formatAggregateCalls,
  formatAggregateCpi,
  formatAggregateNumber,
} from '../../utils/aggregates'
import { computeCpi, formatCpi } from '../../utils/cpi'
import { CallsCell } from '../CallsCell/CallsCell'
import { GRID_TEMPLATE } from './gridColumns'

interface VirtualGridRowProps {
  item: FlatRow
  /** Absolute index in the flat list (for aria-rowindex). */
  flatIndex: number
  size: number
  start: number
  selected: ReadonlySet<number>
  revealRowIndex: number | null
  onToggleGroup: (key: GroupKey) => void
  onToggleRowSelected: (rowIndex: number) => void
  onToggleTerritorySelected: (rowIndices: readonly number[]) => void
  isTerritorySelected: (rowIndices: readonly number[]) => boolean
  isTerritoryIndeterminate: (rowIndices: readonly number[]) => boolean
  getCellState: (rowIndex: number) => CallsCellState | undefined
  onBeginEdit: (rowIndex: number) => boolean
  onDraftChange: (rowIndex: number, raw: string) => void
  onCommitEdit: (rowIndex: number, value?: number) => void
  onCancelEdit: (rowIndex: number) => void
}

function GroupToggleIcon({ expanded }: { expanded: boolean }) {
  return (
    <span className="virtual-grid__toggle" aria-hidden="true">
      {expanded ? '▼' : '▶'}
    </span>
  )
}

export function VirtualGridRow({
  item,
  flatIndex,
  size,
  start,
  selected,
  revealRowIndex,
  onToggleGroup,
  onToggleRowSelected,
  onToggleTerritorySelected,
  isTerritorySelected,
  isTerritoryIndeterminate,
  getCellState,
  onBeginEdit,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
}: VirtualGridRowProps) {
  const style = {
    height: `${size}px`,
    transform: `translateY(${start}px)`,
    gridTemplateColumns: GRID_TEMPLATE,
  } satisfies CSSProperties

  if (item.kind === 'region' || item.kind === 'territory') {
    const label = item.kind === 'region' ? item.region : item.territory
    const level = item.kind === 'region' ? 1 : 2

    return (
      <div
        className={`virtual-grid__row virtual-grid__row--group virtual-grid__row--${item.kind}`}
        style={style}
        role="row"
        aria-expanded={item.expanded}
        aria-level={level}
        aria-rowindex={flatIndex + 2}
      >
        <div className="virtual-grid__cell virtual-grid__cell--select" role="gridcell">
          {item.kind === 'territory' ? (
            <input
              type="checkbox"
              className="virtual-grid__check"
              checked={isTerritorySelected(item.rowIndices)}
              ref={(el) => {
                if (el) {
                  el.indeterminate = isTerritoryIndeterminate(item.rowIndices)
                }
              }}
              onChange={() => onToggleTerritorySelected(item.rowIndices)}
              aria-label={`Select territory ${item.territory}`}
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}
        </div>
        <button
          type="button"
          className="virtual-grid__group-btn"
          style={{ gridColumn: '2 / 7' }}
          onClick={() => onToggleGroup(item.key)}
          aria-label={`${item.expanded ? 'Collapse' : 'Expand'} ${label}`}
        >
          <GroupToggleIcon expanded={item.expanded} />
          <span className="virtual-grid__group-label">
            {item.kind === 'region' ? (
              <>
                <span className="virtual-grid__group-kind">Region</span>
                {item.region}
              </>
            ) : (
              <>
                <span className="virtual-grid__group-kind">Territory</span>
                {item.territory}
              </>
            )}
            <span className="virtual-grid__group-count">
              ({formatAggregateNumber(item.aggregates.hcpCount)} HCPs)
            </span>
          </span>
        </button>
        <div
          className="virtual-grid__cell virtual-grid__cell--right virtual-grid__cell--agg"
          role="gridcell"
        >
          Σ {formatAggregateCalls(item.aggregates)}
        </div>
        <div
          className="virtual-grid__cell virtual-grid__cell--right virtual-grid__cell--agg"
          role="gridcell"
        >
          Σ {formatAggregateNumber(item.aggregates.sumTrx)}
        </div>
        <div
          className="virtual-grid__cell virtual-grid__cell--right virtual-grid__cell--agg"
          role="gridcell"
        >
          Σ {formatAggregateNumber(item.aggregates.sumNrx)}
        </div>
        <div
          className="virtual-grid__cell virtual-grid__cell--right virtual-grid__cell--agg"
          role="gridcell"
        >
          {formatAggregateCpi(item.aggregates)}
        </div>
      </div>
    )
  }

  const { row, rowIndex } = item
  const cpi = computeCpi(row.calls, row.trx)
  const cellState = getCellState(rowIndex)
  const isSelected = selected.has(rowIndex)
  const isRevealed = revealRowIndex === rowIndex

  return (
    <div
      className={`virtual-grid__row virtual-grid__row--hcp${
        isSelected ? ' virtual-grid__row--selected' : ''
      }${isRevealed ? ' virtual-grid__row--revealed' : ''}`}
      style={style}
      role="row"
      aria-level={3}
      aria-rowindex={flatIndex + 2}
      aria-selected={isSelected}
    >
      <div className="virtual-grid__cell virtual-grid__cell--select" role="gridcell">
        <input
          type="checkbox"
          className="virtual-grid__check"
          checked={isSelected}
          onChange={() => onToggleRowSelected(rowIndex)}
          aria-label={`Select ${row.id}`}
        />
      </div>
      <div className="virtual-grid__cell" role="gridcell">
        {row.id}
      </div>
      <div className="virtual-grid__cell" role="gridcell">
        {row.name}
      </div>
      <div className="virtual-grid__cell virtual-grid__cell--muted" role="gridcell">
        {row.specialty ?? '—'}
      </div>
      <div className="virtual-grid__cell" role="gridcell">
        {row.region}
      </div>
      <div className="virtual-grid__cell" role="gridcell">
        {row.territory}
      </div>
      <CallsCell
        rowIndex={rowIndex}
        committedCalls={row.calls}
        cell={cellState}
        onBeginEdit={onBeginEdit}
        onDraftChange={onDraftChange}
        onCommit={onCommitEdit}
        onCancel={onCancelEdit}
      />
      <div className="virtual-grid__cell virtual-grid__cell--right" role="gridcell">
        {row.trx}
      </div>
      <div className="virtual-grid__cell virtual-grid__cell--right" role="gridcell">
        {row.nrx}
      </div>
      <div className="virtual-grid__cell virtual-grid__cell--right" role="gridcell">
        {formatCpi(cpi)}
      </div>
    </div>
  )
}
