import { useCallback, useMemo, useState } from 'react'
import type { HcpRecord } from '../provided/data-generator'
import { buildGroupedTree } from '../grouping/buildGroupedTree'
import { allGroupKeys, flattenVisibleRows } from '../grouping/flattenVisibleRows'
import type { FlatRow, GroupKey, GroupedTree } from '../grouping/types'

export interface UseGroupedRowsResult {
  tree: GroupedTree
  flatRows: FlatRow[]
  collapsed: ReadonlySet<GroupKey>
  toggleGroup: (key: GroupKey) => void
  expandAll: () => void
  collapseAll: () => void
}

/**
 * Groups 50k rows by Region → Territory and flattens for the virtualizer.
 * Expand state is a set of *collapsed* keys (default: all expanded).
 */
export function useGroupedRows(rows: HcpRecord[]): UseGroupedRowsResult {
  const tree = useMemo(() => buildGroupedTree(rows), [rows])

  const [collapsed, setCollapsed] = useState<Set<GroupKey>>(() => new Set())

  const flatRows = useMemo(
    () => flattenVisibleRows(tree, rows, collapsed),
    [tree, rows, collapsed],
  )

  const toggleGroup = useCallback((key: GroupKey) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setCollapsed(new Set())
  }, [])

  const collapseAll = useCallback(() => {
    setCollapsed(new Set(allGroupKeys(tree)))
  }, [tree])

  return { tree, flatRows, collapsed, toggleGroup, expandAll, collapseAll }
}
