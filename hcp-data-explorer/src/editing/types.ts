export type CallsCellStatus = "idle" | "editing" | "pending" | "rejected";

export interface CallsCellState {
  status: CallsCellStatus;
  /** Value shown while editing or pending validation. */
  draftValue?: number;
  /** Rejection reason from validateCalls (string). */
  error?: string;
}

/** One row change inside a command. */
export interface CallsChange {
  rowIndex: number;
  before: number | string;
  after: number;
}

/** Command history entries — single cell or bulk (exactly one undo step). */
export type EditCommand =
  | ({ kind: "single" } & CallsChange)
  | { kind: "bulk"; changes: CallsChange[] };

export interface BulkEditResult {
  applied: number;
  rejected: Array<{ rowIndex: number; message: string }>;
}

export type CommittedCallsMap = ReadonlyMap<number, number>;

export interface UndoRedoOutcome {
  action: "undo" | "redo";
  command: EditCommand;
  /** Indices whose committed Calls were changed. */
  affectedIndices: number[];
  /** Affected rows not in the current search/region filter. */
  hiddenIndices: number[];
}
