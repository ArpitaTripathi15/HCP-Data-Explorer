# HCP Data Explorer

A React + TypeScript web app for exploring 50,000 healthcare-provider (HCP) records with virtualization, grouping, sorting, filtering, async-validated editing, and runtime theming.

## Getting Started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Architecture Overview

```
src/
├── provided/          # Black-box starter files (DO NOT MODIFY)
├── components/        # UI components (VirtualGrid, GridFooter, …)
├── hooks/             # Data loading hooks
├── utils/             # Pure helpers (calls parsing, CPI, …)
└── App.tsx            # Root layout
```

### State Model (evolving)

| Concern | Current approach | Planned |
|---------|------------------|---------|
| Row data | Generated once via `useMemo` in `useHcpData` | Central store with edit overlay |
| Row identity | **Array index** (stable for this dataset) | Same — `id` is not unique |
| Virtualization | `@tanstack/react-virtual` | Same |
| Edits / undo | — | Command history (FR-4) |
| Grouping | — | Region → Territory tree (FR-2) |

### Virtualization (FR-1) — Build vs Buy

**Choice:** `@tanstack/react-virtual`

**Why not a full grid library (AG Grid, TanStack Table)?** Those excel at column features out of the box, but this assignment requires custom semantics for grouping aggregates, async edit lifecycle, and undo that must survive sort/filter/group changes. A headless virtualizer keeps DOM control in our hands while we layer domain logic on top.

**Why not hand-rolled?** Hand-rolling scroll-position math, overscan, and resize handling is error-prone and not where the evaluation focus lies. TanStack Virtual is MIT-licensed, lightweight, and composes cleanly with our own row renderer.

**FR-1 implementation:**
- Fixed row height (40 px) with windowed rendering — only visible rows (+ 12 overscan) exist in the DOM
- Footer reports rows-in-DOM count and last operation timing (data load / scroll frame)

## Progress

| Part | Requirement | Status |
|------|-------------|--------|
| 1 | Foundation + FR-1 Virtualized grid | ✅ Done |
| 2 | FR-2 Two-level grouping with subtotals | Pending |
| 3 | FR-3 Sort, search, filter | Pending |
| 4 | FR-4 Async-validated inline editing + undo | Pending |
| 5 | FR-5/FR-6 Bulk edit & undo-at-scale design | Pending |
| 6 | FR-7 CPI aggregates | Partial (row-level done) |
| 7 | FR-8 Runtime white-labelling | Pending |
| 8 | Tests + ASSUMPTIONS.md | Partial |

## Time Spent

- Part 1: _TBD_

## What I'd Do With More Time

- Keyboard navigation across virtualized rows
- Performance instrumentation with documented findings
- Export pending change-set as JSON diff
