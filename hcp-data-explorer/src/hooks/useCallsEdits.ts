import { useCallback, useMemo, useRef, useState } from "react";
import type { HcpRecord } from "../provided/data-generator";
import { validateCalls } from "../provided/mock-validator";
import { parseCallsValue } from "../utils/calls";
import {
  bumpCallsTenPercent,
  getCommittedCalls,
  getCommandRowIndices,
} from "../utils/editCommands";
import {
  type BulkEditResult,
  type CallsCellState,
  type CallsChange,
  type CommittedCallsMap,
  type EditCommand,
  type UndoRedoOutcome,
} from "../editing/types";

export interface UseCallsEditsResult {
  workingRows: HcpRecord[];
  committed: CommittedCallsMap;
  selected: ReadonlySet<number>;
  selectedCount: number;
  toggleRowSelected: (rowIndex: number) => void;
  toggleTerritorySelected: (rowIndices: readonly number[]) => void;
  clearSelection: () => void;
  isTerritorySelected: (rowIndices: readonly number[]) => boolean;
  isTerritoryIndeterminate: (rowIndices: readonly number[]) => boolean;
  getCellState: (rowIndex: number) => CallsCellState | undefined;
  beginEdit: (rowIndex: number) => boolean;
  setDraft: (rowIndex: number, raw: string) => void;
  cancelEdit: (rowIndex: number) => void;
  commitEdit: (rowIndex: number, value?: number) => Promise<void>;
  applyBulkTenPercent: () => Promise<BulkEditResult | null>;
  bulkBusy: boolean;
  undo: () => UndoRedoOutcome | null;
  redo: () => UndoRedoOutcome | null;
  canUndo: boolean;
  canRedo: boolean;
  lastRejection: { rowIndex: number; message: string } | null;
  dismissRejection: () => void;
  lastBulkResult: BulkEditResult | null;
  dismissBulkResult: () => void;
}

function commandTouchesPending(
  cmd: EditCommand,
  cells: Map<number, CallsCellState>,
): boolean {
  if (cmd.kind === "single") {
    return cells.get(cmd.rowIndex)?.status === "pending";
  }
  return cmd.changes.some((c) => cells.get(c.rowIndex)?.status === "pending");
}

export function useCallsEdits(baseRows: HcpRecord[]): UseCallsEditsResult {
  const [committed, setCommitted] = useState<Map<number, number>>(
    () => new Map(),
  );
  const [cells, setCells] = useState<Map<number, CallsCellState>>(
    () => new Map(),
  );
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [undoStack, setUndoStack] = useState<EditCommand[]>([]);
  const [redoStack, setRedoStack] = useState<EditCommand[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [lastRejection, setLastRejection] = useState<{
    rowIndex: number;
    message: string;
  } | null>(null);
  const [lastBulkResult, setLastBulkResult] = useState<BulkEditResult | null>(
    null,
  );

  const requestTokenRef = useRef<Map<number, number>>(new Map());

  const workingRows = useMemo(() => {
    if (committed.size === 0) return baseRows;
    return baseRows.map((row, i) => {
      const override = committed.get(i);
      return override === undefined ? row : { ...row, calls: override };
    });
  }, [baseRows, committed]);

  const getCellState = useCallback(
    (rowIndex: number) => cells.get(rowIndex),
    [cells],
  );

  const toggleRowSelected = useCallback((rowIndex: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }, []);

  const toggleTerritorySelected = useCallback(
    (rowIndices: readonly number[]) => {
      setSelected((prev) => {
        const next = new Set(prev);
        const allOn =
          rowIndices.length > 0 && rowIndices.every((i) => next.has(i));
        if (allOn) {
          for (const i of rowIndices) next.delete(i);
        } else {
          for (const i of rowIndices) next.add(i);
        }
        return next;
      });
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isTerritorySelected = useCallback(
    (rowIndices: readonly number[]) =>
      rowIndices.length > 0 && rowIndices.every((i) => selected.has(i)),
    [selected],
  );

  const isTerritoryIndeterminate = useCallback(
    (rowIndices: readonly number[]) => {
      if (rowIndices.length === 0) return false;
      const n = rowIndices.filter((i) => selected.has(i)).length;
      return n > 0 && n < rowIndices.length;
    },
    [selected],
  );

  const beginEdit = useCallback(
    (rowIndex: number): boolean => {
      const existing = cells.get(rowIndex);
      if (existing?.status === "pending") return false;

      const current = getCommittedCalls(
        rowIndex,
        baseRows[rowIndex],
        committed,
      );
      const parsed =
        typeof current === "number" ? current : parseCallsValue(current);
      const draftValue = Number.isFinite(parsed) ? parsed : 0;

      setCells((prev) => {
        const next = new Map(prev);
        next.set(rowIndex, { status: "editing", draftValue });
        return next;
      });
      return true;
    },
    [baseRows, cells, committed],
  );

  const setDraft = useCallback((rowIndex: number, raw: string) => {
    const parsed = raw.trim() === "" ? NaN : Number(raw);
    setCells((prev) => {
      const cur = prev.get(rowIndex);
      if (!cur || cur.status !== "editing") return prev;
      const next = new Map(prev);
      next.set(rowIndex, {
        ...cur,
        draftValue: Number.isFinite(parsed) ? parsed : cur.draftValue,
        error: undefined,
      });
      return next;
    });
  }, []);

  const cancelEdit = useCallback((rowIndex: number) => {
    setCells((prev) => {
      const cur = prev.get(rowIndex);
      if (!cur || cur.status === "pending") return prev;
      const next = new Map(prev);
      next.delete(rowIndex);
      return next;
    });
  }, []);

  const commitEdit = useCallback(
    async (rowIndex: number, value?: number) => {
      const cell = cells.get(rowIndex);
      if (!cell || cell.status === "pending") return;
      if (cell.status !== "editing") return;

      const newValue = value ?? cell.draftValue;
      if (newValue === undefined || !Number.isFinite(newValue)) {
        const message = "Calls must be a finite number";
        setCells((prev) => {
          const next = new Map(prev);
          next.set(rowIndex, { status: "rejected", error: message });
          return next;
        });
        setLastRejection({ rowIndex, message });
        return;
      }

      const before = getCommittedCalls(rowIndex, baseRows[rowIndex], committed);
      const beforeNum =
        typeof before === "number" ? before : parseCallsValue(before);
      if (Number.isFinite(beforeNum) && beforeNum === newValue) {
        setCells((prev) => {
          const next = new Map(prev);
          next.delete(rowIndex);
          return next;
        });
        return;
      }

      const token = (requestTokenRef.current.get(rowIndex) ?? 0) + 1;
      requestTokenRef.current.set(rowIndex, token);

      setCells((prev) => {
        const next = new Map(prev);
        next.set(rowIndex, { status: "pending", draftValue: newValue });
        return next;
      });

      try {
        await validateCalls(newValue);
        if (requestTokenRef.current.get(rowIndex) !== token) return;

        setCommitted((prev) => {
          const next = new Map(prev);
          next.set(rowIndex, newValue);
          return next;
        });
        setCells((prev) => {
          const next = new Map(prev);
          next.delete(rowIndex);
          return next;
        });
        setUndoStack((prev) => [
          ...prev,
          { kind: "single", rowIndex, before, after: newValue },
        ]);
        setRedoStack([]);
      } catch (err) {
        if (requestTokenRef.current.get(rowIndex) !== token) return;
        const message = typeof err === "string" ? err : "Validation failed";
        setCells((prev) => {
          const next = new Map(prev);
          next.set(rowIndex, { status: "rejected", error: message });
          return next;
        });
        setLastRejection({ rowIndex, message });
      }
    },
    [baseRows, cells, committed],
  );

  const applyCommittedValue = useCallback(
    (rowIndex: number, value: number | string) => {
      setCommitted((prev) => {
        const next = new Map(prev);
        const original = baseRows[rowIndex].calls;
        if (value === original) {
          next.delete(rowIndex);
        } else if (typeof value === "number") {
          next.set(rowIndex, value);
        } else {
          const n = parseCallsValue(value);
          if (
            Number.isFinite(n) &&
            n === Number(original) &&
            typeof original === "string"
          ) {
            next.delete(rowIndex);
          } else if (Number.isFinite(n)) {
            next.set(rowIndex, n);
          } else {
            next.delete(rowIndex);
          }
        }
        return next;
      });
      setCells((prev) => {
        if (!prev.has(rowIndex)) return prev;
        const next = new Map(prev);
        next.delete(rowIndex);
        return next;
      });
    },
    [baseRows],
  );

  const applyBulkTenPercent =
    useCallback(async (): Promise<BulkEditResult | null> => {
      if (selected.size === 0 || bulkBusy) return null;

      const targets: CallsChange[] = [];

      for (const rowIndex of selected) {
        if (cells.get(rowIndex)?.status === "pending") continue;
        const before = getCommittedCalls(
          rowIndex,
          baseRows[rowIndex],
          committed,
        );
        const after = bumpCallsTenPercent(before);
        if (after === null) continue;
        const beforeNum =
          typeof before === "number" ? before : parseCallsValue(before);
        if (Number.isFinite(beforeNum) && beforeNum === after) continue;
        targets.push({ rowIndex, before, after });
      }

      if (targets.length === 0) {
        const empty = {
          applied: 0,
          rejected: [] as BulkEditResult["rejected"],
        };
        setLastBulkResult(empty);
        return empty;
      }

      setBulkBusy(true);

      const tokens = new Map<number, number>();
      for (const t of targets) {
        const token = (requestTokenRef.current.get(t.rowIndex) ?? 0) + 1;
        requestTokenRef.current.set(t.rowIndex, token);
        tokens.set(t.rowIndex, token);
      }

      setCells((prev) => {
        const next = new Map(prev);
        for (const t of targets) {
          next.set(t.rowIndex, { status: "pending", draftValue: t.after });
        }
        return next;
      });

      const settled = await Promise.all(
        targets.map(async (t) => {
          try {
            await validateCalls(t.after);
            return { ok: true as const, ...t };
          } catch (err) {
            const message = typeof err === "string" ? err : "Validation failed";
            return { ok: false as const, ...t, message };
          }
        }),
      );

      const appliedFinal: CallsChange[] = [];
      const rejectedFinal: BulkEditResult["rejected"] = [];
      for (const r of settled) {
        const token = tokens.get(r.rowIndex);
        if (
          token !== undefined &&
          requestTokenRef.current.get(r.rowIndex) !== token
        ) {
          continue;
        }
        if (r.ok) {
          appliedFinal.push({
            rowIndex: r.rowIndex,
            before: r.before,
            after: r.after,
          });
        } else {
          rejectedFinal.push({ rowIndex: r.rowIndex, message: r.message });
        }
      }

      if (appliedFinal.length > 0) {
        setCommitted((prev) => {
          const next = new Map(prev);
          for (const c of appliedFinal) next.set(c.rowIndex, c.after);
          return next;
        });
        setUndoStack((prev) => [
          ...prev,
          { kind: "bulk", changes: appliedFinal },
        ]);
        setRedoStack([]);
      }

      setCells((prev) => {
        const next = new Map(prev);
        for (const c of appliedFinal) next.delete(c.rowIndex);
        for (const r of rejectedFinal) {
          next.set(r.rowIndex, { status: "rejected", error: r.message });
        }
        return next;
      });

      const result: BulkEditResult = {
        applied: appliedFinal.length,
        rejected: rejectedFinal,
      };
      setLastBulkResult(result);
      setBulkBusy(false);
      return result;
    }, [selected, bulkBusy, cells, baseRows, committed]);

  const undo = useCallback((): UndoRedoOutcome | null => {
    if (undoStack.length === 0) return null;
    const cmd = undoStack[undoStack.length - 1];
    if (commandTouchesPending(cmd, cells)) return null;

    if (cmd.kind === "single") {
      applyCommittedValue(cmd.rowIndex, cmd.before);
    } else {
      for (const c of cmd.changes) {
        applyCommittedValue(c.rowIndex, c.before);
      }
    }
    setUndoStack(undoStack.slice(0, -1));
    setRedoStack((r) => [...r, cmd]);
    const affectedIndices = getCommandRowIndices(cmd);
    return { action: "undo", command: cmd, affectedIndices, hiddenIndices: [] };
  }, [undoStack, cells, applyCommittedValue]);

  const redo = useCallback((): UndoRedoOutcome | null => {
    if (redoStack.length === 0) return null;
    const cmd = redoStack[redoStack.length - 1];
    if (commandTouchesPending(cmd, cells)) return null;

    if (cmd.kind === "single") {
      applyCommittedValue(cmd.rowIndex, cmd.after);
    } else {
      for (const c of cmd.changes) {
        applyCommittedValue(c.rowIndex, c.after);
      }
    }
    setRedoStack(redoStack.slice(0, -1));
    setUndoStack((u) => [...u, cmd]);
    const affectedIndices = getCommandRowIndices(cmd);
    return { action: "redo", command: cmd, affectedIndices, hiddenIndices: [] };
  }, [redoStack, cells, applyCommittedValue]);

  const dismissRejection = useCallback(() => {
    setLastRejection(null);
    setCells((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const [idx, cell] of next) {
        if (cell.status === "rejected") {
          next.delete(idx);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const dismissBulkResult = useCallback(() => {
    setLastBulkResult(null);
    setCells((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const [idx, cell] of next) {
        if (cell.status === "rejected") {
          next.delete(idx);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  return {
    workingRows,
    committed,
    selected,
    selectedCount: selected.size,
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
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    lastRejection,
    dismissRejection,
    lastBulkResult,
    dismissBulkResult,
  };
}
