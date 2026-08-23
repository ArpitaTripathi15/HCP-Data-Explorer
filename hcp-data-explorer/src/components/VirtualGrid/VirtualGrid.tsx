import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useRef } from 'react'
import type { HcpRecord } from '../../provided/data-generator'
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
  rows: HcpRecord[]
  onMetricsChange?: (metrics: GridMetrics) => void
}

export function VirtualGrid({ rows, onMetricsChange }: VirtualGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const scrollFrameRef = useRef<number | null>(null)
  const hasReportedInitialRef = useRef(false)

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
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
        {GRID_COLUMNS.map((col) => (
          <div
            key={col.key}
            className={`virtual-grid__header-cell${col.align === 'right' ? ' virtual-grid__header-cell--right' : ''}`}
          >
            {col.label}
          </div>
        ))}
      </div>

      <div
        ref={parentRef}
        className="virtual-grid__body"
        onScroll={handleScroll}
        role="grid"
        aria-rowcount={rows.length}
        aria-colcount={GRID_COLUMNS.length}
      >
        <div
          className="virtual-grid__scroll-area"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index]
            const cpi = computeCpi(row.calls, row.trx)

            return (
              <div
                key={virtualRow.index}
                className="virtual-grid__row"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: GRID_TEMPLATE,
                }}
                role="row"
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
