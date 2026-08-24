import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useRef } from 'react'
import type { CallsCellState } from '../../editing/types'
import type { FlatRow, GroupKey } from '../../grouping/types'
import type { SortColumn, SortState } from '../../grouping/sortTree'
import { GRID_COLUMNS, GRID_TEMPLATE, ROW_HEIGHT } from './gridColumns'
import { VirtualGridRow } from './VirtualGridRow'
import './VirtualGrid.css'

export interface GridMetrics {
  rowsInDom: number
  lastOperationMs: number
  operation: string
}

interface VirtualGridProps {
  flatRows: FlatRow[]
  sort: SortState | null
  onCycleSort: (column: SortColumn) => void
  onToggleGroup: (key: GroupKey) => void
  selected: ReadonlySet<number>
  onToggleRowSelected: (rowIndex: number) => void
  onToggleTerritorySelected: (rowIndices: readonly number[]) => void
  isTerritorySelected: (rowIndices: readonly number[]) => boolean
  isTerritoryIndeterminate: (rowIndices: readonly number[]) => boolean
  getCellState: (rowIndex: number) => CallsCellState | undefined
  onBeginEdit: (rowIndex: number) => boolean
  onDraftChange: (rowIndex: number, raw: string) => void
  onCommitEdit: (rowIndex: number, value?: number) => void
  onCancelEdit: (rowIndex: number) => void
  /** Scroll to and briefly highlight this HCP row (undo reveal). */
  revealRowIndex?: number | null
  onRevealComplete?: () => void
  onMetricsChange?: (metrics: GridMetrics) => void
}

function sortIndicator(sort: SortState | null, column: SortColumn): string {
  if (!sort || sort.column !== column) return ''
  return sort.direction === 'asc' ? ' ↑' : ' ↓'
}

export function VirtualGrid({
  flatRows,
  sort,
  onCycleSort,
  onToggleGroup,
  selected,
  onToggleRowSelected,
  onToggleTerritorySelected,
  isTerritorySelected,
  isTerritoryIndeterminate,
  getCellState,
  onBeginEdit,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
  revealRowIndex = null,
  onRevealComplete,
  onMetricsChange,
}: VirtualGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const scrollFrameRef = useRef<number | null>(null)
  const hasReportedInitialRef = useRef(false)

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  // After undo/redo expands groups, scroll the affected row into view.
  useEffect(() => {
    if (revealRowIndex === null) return

    const flatIdx = flatRows.findIndex(
      (r) => r.kind === 'hcp' && r.rowIndex === revealRowIndex,
    )
    if (flatIdx < 0) return

    rowVirtualizer.scrollToIndex(flatIdx, { align: 'center' })
    onRevealComplete?.()
  }, [revealRowIndex, flatRows, rowVirtualizer, onRevealComplete])

  const virtualItems = rowVirtualizer.getVirtualItems()

  useEffect(() => {
    if (virtualItems.length === 0 || hasReportedInitialRef.current) return

    const start = performance.now()
    requestAnimationFrame(() => {
      hasReportedInitialRef.current = true
      onMetricsChange?.({
        rowsInDom: virtualItems.length,
        lastOperationMs: performance.now() - start,
        operation: 'initial render',
      })
    })
  }, [virtualItems.length, onMetricsChange])

  useEffect(() => {
    hasReportedInitialRef.current = false
  }, [flatRows.length])

  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current)
    }

    const start = performance.now()
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null
      const elapsed = performance.now() - start
      onMetricsChange?.({
        rowsInDom: rowVirtualizer.getVirtualItems().length,
        lastOperationMs: elapsed,
        operation: 'scroll frame',
      })
    })
  }, [rowVirtualizer, onMetricsChange])

  return (
    <div className="virtual-grid">
      <div className="virtual-grid__header" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
        <div
          className="virtual-grid__header-cell virtual-grid__header-cell--select"
          aria-hidden="true"
        />
        {GRID_COLUMNS.map((col) => {
          const active = sort?.column === col.key
          return (
            <button
              key={col.key}
              type="button"
              className={`virtual-grid__header-cell virtual-grid__header-btn${col.align === 'right' ? ' virtual-grid__header-cell--right' : ''
                }${active ? ' virtual-grid__header-btn--active' : ''}`}
              onClick={() => onCycleSort(col.key)}
              aria-label={`Sort by ${col.label}`}
            >
              {col.label}
              <span className="virtual-grid__sort-ind" aria-hidden="true">
                {sortIndicator(sort, col.key) || ' ↕'}
              </span>
            </button>
          )
        })}
      </div>

      <div
        ref={parentRef}
        className="virtual-grid__body"
        onScroll={handleScroll}
        role="treegrid"
        aria-rowcount={flatRows.length}
        aria-colcount={GRID_COLUMNS.length + 1}
      >
        <div
          className="virtual-grid__scroll-area"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {virtualItems.map((virtualRow) => {
            const item = flatRows[virtualRow.index]
            return (
              <VirtualGridRow
                key={item.kind === 'hcp' ? item.rowIndex : item.key}
                item={item}
                flatIndex={virtualRow.index}
                size={virtualRow.size}
                start={virtualRow.start}
                selected={selected}
                revealRowIndex={revealRowIndex}
                onToggleGroup={onToggleGroup}
                onToggleRowSelected={onToggleRowSelected}
                onToggleTerritorySelected={onToggleTerritorySelected}
                isTerritorySelected={isTerritorySelected}
                isTerritoryIndeterminate={isTerritoryIndeterminate}
                getCellState={getCellState}
                onBeginEdit={onBeginEdit}
                onDraftChange={onDraftChange}
                onCommitEdit={onCommitEdit}
                onCancelEdit={onCancelEdit}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
