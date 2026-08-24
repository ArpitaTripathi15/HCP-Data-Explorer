import { useState } from "react";
import { generateRows, type HcpRecord } from "../provided/data-generator";

export interface HcpDataState {
  rows: HcpRecord[];
  loadTimeMs: number;
}

export type RowIndex = number;

export function useHcpData(): HcpDataState {
  const [state] = useState<HcpDataState>(() => {
    const start = performance.now();
    const rows = generateRows();
    return { rows, loadTimeMs: performance.now() - start };
  });
  return state;
}
