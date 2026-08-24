import type { CommittedCallsMap, EditCommand } from "../editing/types";
import type { HcpRecord } from "../provided/data-generator";
import { parseCallsValue } from "./calls";

/** +10% Calls, rounded to nearest integer. */
export function bumpCallsTenPercent(calls: number | string): number | null {
  const n = parseCallsValue(calls);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 1.1);
}

/** Row indices touched by an undo/redo command. */
export function getCommandRowIndices(cmd: EditCommand): number[] {
  if (cmd.kind === "single") return [cmd.rowIndex];
  return cmd.changes.map((c) => c.rowIndex);
}

/** Committed Calls for aggregates/sort — pending excluded. */
export function getCommittedCalls(
  rowIndex: number,
  original: HcpRecord,
  committed: CommittedCallsMap,
): number | string {
  const override = committed.get(rowIndex);
  return override !== undefined ? override : original.calls;
}
