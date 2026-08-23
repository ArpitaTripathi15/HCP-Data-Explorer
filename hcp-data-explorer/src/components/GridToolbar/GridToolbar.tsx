import './GridToolbar.css'

interface GridToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  regions: string[]
  regionFilter: string | null
  onRegionFilterChange: (region: string | null) => void
  matchedCount: number
  totalCount: number
  onExpandAll: () => void
  onCollapseAll: () => void
}

export function GridToolbar({
  search,
  onSearchChange,
  regions,
  regionFilter,
  onRegionFilterChange,
  matchedCount,
  totalCount,
  onExpandAll,
  onCollapseAll,
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
      </p>

      <div className="grid-toolbar__actions">
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
