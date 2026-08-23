import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_THEME } from './provided/theme-config'
import { GridFooter } from './components/GridFooter/GridFooter'
import { GridToolbar } from './components/GridToolbar/GridToolbar'
import { VirtualGrid, type GridMetrics } from './components/VirtualGrid/VirtualGrid'
import { useCallsEdits } from './hooks/useCallsEdits'
import { useGroupedRows } from './hooks/useGroupedRows'
import { useHcpData } from './hooks/useHcpData'
import './App.css'

function App() {
  const { rows, loadTimeMs } = useHcpData()
  const {
    workingRows,
    selected,
    selectedCount,
    toggleRowSelected,
    toggleTerritorySelected,
    clearSelection,
    isTerritorySelected,
    isTerritoryIndeterminate,
    getCellState,
    beginEdit,
    setDraft,
    cancelEdit,
    commitEdit,
    applyBulkTenPercent,
    bulkBusy,
    undo,
    redo,
    canUndo,
    canRedo,
    lastRejection,
    dismissRejection,
    lastBulkResult,
    dismissBulkResult,
  } = useCallsEdits(rows)

  const {
    flatRows,
    matchedCount,
    regions,
    search,
    setSearch,
    regionFilter,
    setRegionFilter,
    sort,
    cycleSort,
    toggleGroup,
    expandAll,
    collapseAll,
  } = useGroupedRows(workingRows)

  const [metrics, setMetrics] = useState<GridMetrics>({
    rowsInDom: 0,
    lastOperationMs: loadTimeMs,
    operation: 'data load',
  })

  const handleMetricsChange = useCallback((next: GridMetrics) => {
    setMetrics(next)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return
      }
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      } else if (e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return (
    <div
      className="app"
      style={{
        ['--color-primary' as string]: DEFAULT_THEME.primary,
        ['--color-on-primary' as string]: DEFAULT_THEME.onPrimary,
        ['--color-background' as string]: DEFAULT_THEME.background,
        ['--color-surface' as string]: DEFAULT_THEME.surface,
        ['--color-text' as string]: DEFAULT_THEME.text,
        ['--color-text-muted' as string]: '#5A6B7D',
        ['--color-border' as string]: '#D8DEE6',
        ['--color-row-hover' as string]: '#F7FAFC',
        ['--radius' as string]: `${DEFAULT_THEME.radius}px`,
      }}
    >
      <header className="app__header">
        <div className="app__header-top">
          <div>
            <h1 className="app__title">{DEFAULT_THEME.appName}</h1>
            <p className="app__subtitle">
              {rows.length.toLocaleString()} healthcare provider records · grouped by
              Region → Territory
            </p>
          </div>
        </div>
      </header>

      <main className="app__main">
        {lastBulkResult ? (
          <div
            className={`app__banner${
              lastBulkResult.rejected.length > 0 ? '' : ' app__banner--ok'
            }`}
            role="status"
          >
            <span>
              Bulk +10% calls: <strong>{lastBulkResult.applied}</strong> applied
              {lastBulkResult.rejected.length > 0 ? (
                <>
                  , <strong>{lastBulkResult.rejected.length}</strong> rejected
                  {lastBulkResult.rejected.length <= 5 ? (
                    <>
                      {' '}
                      (
                      {lastBulkResult.rejected
                        .map((r) => `row ${r.rowIndex}: ${r.message}`)
                        .join('; ')}
                      )
                    </>
                  ) : (
                    <>
                      {' '}
                      (e.g.{' '}
                      {lastBulkResult.rejected
                        .slice(0, 3)
                        .map((r) => `row ${r.rowIndex}: ${r.message}`)
                        .join('; ')}
                      ; …)
                    </>
                  )}
                </>
              ) : null}
              . Successful rows form one undo step.
            </span>
            <button
              type="button"
              className="app__banner-dismiss"
              onClick={dismissBulkResult}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {lastRejection && !lastBulkResult ? (
          <div className="app__banner" role="alert">
            <span>
              Edit rejected (row {lastRejection.rowIndex}): {lastRejection.message}
            </span>
            <button
              type="button"
              className="app__banner-dismiss"
              onClick={dismissRejection}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <GridToolbar
          search={search}
          onSearchChange={setSearch}
          regions={regions}
          regionFilter={regionFilter}
          onRegionFilterChange={setRegionFilter}
          matchedCount={matchedCount}
          totalCount={rows.length}
          selectedCount={selectedCount}
          bulkBusy={bulkBusy}
          onBulkTenPercent={() => {
            void applyBulkTenPercent()
          }}
          onClearSelection={clearSelection}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />
        <VirtualGrid
          flatRows={flatRows}
          sort={sort}
          onCycleSort={cycleSort}
          onToggleGroup={toggleGroup}
          selected={selected}
          onToggleRowSelected={toggleRowSelected}
          onToggleTerritorySelected={toggleTerritorySelected}
          isTerritorySelected={isTerritorySelected}
          isTerritoryIndeterminate={isTerritoryIndeterminate}
          getCellState={getCellState}
          onBeginEdit={beginEdit}
          onDraftChange={setDraft}
          onCommitEdit={commitEdit}
          onCancelEdit={cancelEdit}
          onMetricsChange={handleMetricsChange}
        />
      </main>

      <GridFooter
        totalRows={matchedCount}
        rowsInDom={metrics.rowsInDom}
        lastOperationMs={metrics.operation === 'data load' ? loadTimeMs : metrics.lastOperationMs}
        operation={metrics.operation}
      />
    </div>
  )
}

export default App
