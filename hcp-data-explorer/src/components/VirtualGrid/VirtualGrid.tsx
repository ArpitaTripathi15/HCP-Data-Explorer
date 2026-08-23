import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useRef } from 'react'
import type { FlatRow, GroupKey } from '../../grouping/types'
import type { SortColumn, SortState } from '../../grouping/sortTree'
import {
  formatAggregateCalls,
  formatAggregateCpi,
  formatAggregateNumber,
} from '../../utils/aggregates'
import { formatCallsDisplay } from '../../utils/calls'
import { computeCpi, formatCpi } from '../../utils/cpi'
import { GRID_COLUMNS, GRID_TEMPLATE, ROW_HEIGHT } from './gridColumns'
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
  onMetricsChange?: (metrics: GridMetrics) => void
}

function GroupToggleIcon({ expanded }: { expanded: boolean }) {
  return (
    <span className="virtual-grid__toggle" aria-hidden="true">
      {expanded ? '▼' : '▶'}
    </span>
  )
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
        {GRID_COLUMNS.map((col) => {
          const active = sort?.column === col.key
          return (
            <button
              key={col.key}
              type="button"
              className={`virtual-grid__header-cell virtual-grid__header-btn${
                col.align === 'right' ? ' virtual-grid__header-cell--right' : ''
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
        aria-colcount={GRID_COLUMNS.length}
      >
        <div
          className="virtual-grid__scroll-area"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {virtualItems.map((virtualRow) => {
            const item = flatRows[virtualRow.index]
            const style = {
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
              gridTemplateColumns: GRID_TEMPLATE,
            } as const

            if (item.kind === 'region' || item.kind === 'territory') {
              const label = item.kind === 'region' ? item.region : item.territory
              const level = item.kind === 'region' ? 1 : 2

              return (
                <div
                  key={item.key}
                  className={`virtual-grid__row virtual-grid__row--group virtual-grid__row--${item.kind}`}
                  style={style}
                  role="row"
                  aria-expanded={item.expanded}
                  aria-level={level}
                  aria-rowindex={virtualRow.index + 2}
                >
                  <button
                    type="button"
                    className="virtual-grid__group-btn"
                    style={{ gridColumn: '1 / 6' }}
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
                  <div className="virtual-grid__cell virtual-grid__cell--right virtual-grid__cell--agg" role="gridcell">
                    Σ {formatAggregateCalls(item.aggregates)}
                  </div>
                  <div className="virtual-grid__cell virtual-grid__cell--right virtual-grid__cell--agg" role="gridcell">
                    Σ {formatAggregateNumber(item.aggregates.sumTrx)}
                  </div>
                  <div className="virtual-grid__cell virtual-grid__cell--right virtual-grid__cell--agg" role="gridcell">
                    Σ {formatAggregateNumber(item.aggregates.sumNrx)}
                  </div>
                  <div className="virtual-grid__cell virtual-grid__cell--right virtual-grid__cell--agg" role="gridcell">
                    {formatAggregateCpi(item.aggregates)}
                  </div>
                </div>
              )
            }

            const { row, rowIndex } = item
            const cpi = computeCpi(row.calls, row.trx)

            return (
              <div
                key={rowIndex}
                className="virtual-grid__row virtual-grid__row--hcp"
                style={style}
                role="row"
                aria-level={3}
                aria-rowindex={virtualRow.index + 2}
              >
                <div className="virtual-grid__cell" role="gridcell">
                  {row.id}
                </div>
                <div className="virtual-grid__cell" role="gridcell">
                  {row.name}
                </div>
                <div
                  className="virtual-grid__cell virtual-grid__cell--muted"
                  role="gridcell"
                >
                  {row.specialty ?? '—'}
                </div>
                <div className="virtual-grid__cell" role="gridcell">
                  {row.region}
                </div>
                <div className="virtual-grid__cell" role="gridcell">
                  {row.territory}
                </div>
                <div className="virtual-grid__cell virtual-grid__cell--right" role="gridcell">
                  {formatCallsDisplay(row.calls)}
                </div>
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
          })}
        </div>
      </div>
    </div>
  )
}
