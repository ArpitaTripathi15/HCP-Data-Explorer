import './GridToolbar.css'

interface GridToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  regions: string[]
  regionFilter: string | null
  onRegionFilterChange: (region: string | null) => void
  matchedCount: number
  totalCount: number
  selectedCount: number
  bulkBusy: boolean
  onBulkTenPercent: () => void
  onClearSelection: () => void
  onExpandAll: () => void
  onCollapseAll: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function GridToolbar({
  search,
  onSearchChange,
  regions,
  regionFilter,
  onRegionFilterChange,
  matchedCount,
  totalCount,
  selectedCount,
  bulkBusy,
  onBulkTenPercent,
  onClearSelection,
  onExpandAll,
  onCollapseAll,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: GridToolbarProps) {
  return (
    <div className="grid-toolbar">
      <label className="grid-toolbar__field">
        <span className="grid-toolbar__label">Search</span>
        <input
          type="search"
          className="grid-toolbar__input"
          placeholder="Name or HCP ID…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search by name or HCP ID"
        />
      </label>

      <label className="grid-toolbar__field">
        <span className="grid-toolbar__label">Region</span>
        <select
          className="grid-toolbar__select"
          value={regionFilter ?? ''}
          onChange={(e) =>
            onRegionFilterChange(e.target.value === '' ? null : e.target.value)
          }
          aria-label="Filter by region"
        >
          <option value="">All regions</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </label>

      <p className="grid-toolbar__count" aria-live="polite">
        Showing <strong>{matchedCount.toLocaleString()}</strong> of{' '}
        {totalCount.toLocaleString()}
        {selectedCount > 0 ? (
          <>
            {' '}
            · <strong>{selectedCount.toLocaleString()}</strong> selected
          </>
        ) : null}
      </p>

      <div className="grid-toolbar__actions">
        <button
          type="button"
          className="grid-toolbar__btn grid-toolbar__btn--primary"
          onClick={onBulkTenPercent}
          disabled={selectedCount === 0 || bulkBusy}
          title="Increase Calls by 10% for selection"
        >
          {bulkBusy ? 'Applying…' : '+10% calls'}
        </button>
        <button
          type="button"
          className="grid-toolbar__btn"
          onClick={onClearSelection}
          disabled={selectedCount === 0 || bulkBusy}
        >
          Clear selection
        </button>
        <button
          type="button"
          className="grid-toolbar__btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last Calls edit (⌘Z)"
        >
          Undo
        </button>
        <button
          type="button"
          className="grid-toolbar__btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo Calls edit (⇧⌘Z)"
        >
          Redo
        </button>
        <button type="button" className="grid-toolbar__btn" onClick={onExpandAll}>
          Expand all
        </button>
        <button type="button" className="grid-toolbar__btn" onClick={onCollapseAll}>
          Collapse all
        </button>
      </div>
    </div>
  )
}
