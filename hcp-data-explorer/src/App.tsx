import { useCallback, useState } from 'react'
import { DEFAULT_THEME } from './provided/theme-config'
import { GridFooter } from './components/GridFooter/GridFooter'
import { VirtualGrid, type GridMetrics } from './components/VirtualGrid/VirtualGrid'
import { useGroupedRows } from './hooks/useGroupedRows'
import { useHcpData } from './hooks/useHcpData'
import './App.css'

function App() {
  const { rows, loadTimeMs } = useHcpData()
  const { flatRows, toggleGroup, expandAll, collapseAll } = useGroupedRows(rows)
  const [metrics, setMetrics] = useState<GridMetrics>({
    rowsInDom: 0,
    lastOperationMs: loadTimeMs,
    operation: 'data load',
  })

  const handleMetricsChange = useCallback((next: GridMetrics) => {
    setMetrics(next)
  }, [])

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
          <div className="app__toolbar">
            <button type="button" className="app__toolbar-btn" onClick={expandAll}>
              Expand all
            </button>
            <button type="button" className="app__toolbar-btn" onClick={collapseAll}>
              Collapse all
            </button>
          </div>
        </div>
      </header>

      <main className="app__main">
        <VirtualGrid
          flatRows={flatRows}
          onToggleGroup={toggleGroup}
          onMetricsChange={handleMetricsChange}
        />
      </main>

      <GridFooter
        totalRows={rows.length}
        rowsInDom={metrics.rowsInDom}
        lastOperationMs={metrics.operation === 'data load' ? loadTimeMs : metrics.lastOperationMs}
        operation={metrics.operation}
      />
    </div>
  )
}

export default App
