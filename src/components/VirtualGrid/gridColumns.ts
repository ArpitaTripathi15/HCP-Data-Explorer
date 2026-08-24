export const ROW_HEIGHT = 40

export const SELECT_COL_WIDTH = '44px'

export const GRID_COLUMNS = [
  { key: 'id', label: 'HCP ID', width: '120px', align: 'left' as const },
  { key: 'name', label: 'Name', width: '160px', align: 'left' as const },
  { key: 'specialty', label: 'Specialty', width: '130px', align: 'left' as const },
  { key: 'region', label: 'Region', width: '110px', align: 'left' as const },
  { key: 'territory', label: 'Territory', width: '180px', align: 'left' as const },
  { key: 'calls', label: 'Calls', width: '80px', align: 'right' as const },
  { key: 'trx', label: 'TRx', width: '80px', align: 'right' as const },
  { key: 'nrx', label: 'NRx', width: '80px', align: 'right' as const },
  { key: 'cpi', label: 'CPI', width: '80px', align: 'right' as const },
] as const

export type GridColumnKey = (typeof GRID_COLUMNS)[number]['key']

export const GRID_TEMPLATE = [SELECT_COL_WIDTH, ...GRID_COLUMNS.map((c) => c.width)].join(
  ' ',
)
