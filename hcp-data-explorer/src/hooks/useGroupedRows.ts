import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { buildGroupedTree } from "../grouping/buildGroupedTree";
import { filterRowIndices, listRegions } from "../grouping/filterRows";
import {
  allGroupKeys,
  flattenVisibleRows,
} from "../grouping/flattenVisibleRows";
import { ancestorKeysForRows } from "../grouping/revealRows";
import {
  applySortToTree,
  nextSortState,
  type SortColumn,
  type SortState,
} from "../grouping/sortTree";
import type { FlatRow, GroupKey, GroupedTree } from "../grouping/types";
import type { HcpRecord } from "../provided/data-generator";

export interface UseGroupedRowsResult {
  tree: GroupedTree;
  flatRows: FlatRow[];
  matchedCount: number;
  regions: string[];
  search: string;
  setSearch: (value: string) => void;
  regionFilter: string | null;
  setRegionFilter: (region: string | null) => void;
  sort: SortState | null;
  cycleSort: (column: SortColumn) => void;
  collapsed: ReadonlySet<GroupKey>;
  toggleGroup: (key: GroupKey) => void;
  expandAll: () => void;
  collapseAll: () => void;
  /** True when row passes current search + region filter. */
  isRowInFilteredView: (rowIndex: number) => boolean;
  /** Expand region/territory so these rows can appear in the flat list. */
  expandAncestorsForRows: (rowIndices: readonly number[]) => void;
}

/**
 * Groups rows by Region → Territory with search, region filter, and column sort.
 * Search uses a deferred value so typing stays responsive over 50k rows.
 */
export function useGroupedRows(rows: HcpRecord[]): UseGroupedRowsResult {
  const [search, setSearchState] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState | null>(null);
  const [collapsed, setCollapsed] = useState<Set<GroupKey>>(() => new Set());

  /** Auto-expand matching groups when search is applied (event handler, not effect). */
  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    if (value.trim()) {
      setCollapsed(new Set());
    }
  }, []);

  const regions = useMemo(() => listRegions(rows), [rows]);

  const filteredIndices = useMemo(
    () =>
      filterRowIndices(rows, {
        search: deferredSearch,
        region: regionFilter,
      }),
    [rows, deferredSearch, regionFilter],
  );

  const filteredSet = useMemo(
    () => new Set(filteredIndices),
    [filteredIndices],
  );

  const isRowInFilteredView = useCallback(
    (rowIndex: number) => filteredSet.has(rowIndex),
    [filteredSet],
  );

  const expandAncestorsForRows = useCallback(
    (rowIndices: readonly number[]) => {
      if (rowIndices.length === 0) return;
      const keysToExpand = ancestorKeysForRows(rows, rowIndices);
      setCollapsed((prev) => {
        const next = new Set(prev);
        for (const key of keysToExpand) next.delete(key);
        return next;
      });
    },
    [rows],
  );

  const baseTree = useMemo(
    () => buildGroupedTree(rows, filteredIndices),
    [rows, filteredIndices],
  );

  const tree = useMemo(
    () => applySortToTree(baseTree, rows, sort),
    [baseTree, rows, sort],
  );

  const flatRows = useMemo(
    () => flattenVisibleRows(tree, rows, collapsed),
    [tree, rows, collapsed],
  );

  const toggleGroup = useCallback((key: GroupKey) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsed(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsed(new Set(allGroupKeys(tree)));
  }, [tree]);

  const cycleSort = useCallback((column: SortColumn) => {
    setSort((prev) => nextSortState(prev, column));
  }, []);

  return {
    tree,
    flatRows,
    matchedCount: filteredIndices.length,
    regions,
    search,
    setSearch,
    regionFilter,
    setRegionFilter,
    sort,
    cycleSort,
    collapsed,
    toggleGroup,
    expandAll,
    collapseAll,
    isRowInFilteredView,
    expandAncestorsForRows,
  };
}
