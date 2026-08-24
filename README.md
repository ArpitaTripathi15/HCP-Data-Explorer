# HCP Data Explorer

A React + TypeScript app for exploring a large healthcare-provider (HCP) roster. The grid loads 50,000 records, groups them by region and territory, and lets field teams search, sort, edit Calls, and switch tenant branding without a rebuild.

## Run the app

Node 20+ is required.

```bash
npm install
npm run dev
```

Open the localhost.

Optional query param: `?tenant=aurelia` or `?tenant=meridian`.

## What you can do

**Browse.** Records sit in a two-level tree: Region → Territory → HCP. Group rows show Σ Calls, Σ TRx, Σ NRx, HCP count, and CPI (`Calls ÷ TRx × 100`, or `—` when TRx is zero). Click a group to expand or collapse it; the toolbar has Expand all / Collapse all.

**Find rows.** Search matches name or HCP ID (case-insensitive). The region dropdown narrows the same view. Counts and aggregates always reflect the current subset.

**Sort.** Click a column header to cycle ascending → descending → unsorted. Numeric columns also reorder regions and territories by that column’s aggregate.

**Edit Calls.** Click a Calls cell, type a value, press Enter (or blur). The value is validated asynchronously. While pending, the cell is locked and group totals still use the last accepted number. A rejection banner shows why the change was refused.

**Bulk update.** Check individual rows or a whole territory, then **+10% calls**. Each selected row is validated independently. The banner reports how many applied vs rejected; one Undo reverses the applied subset.

**Undo / redo.** Toolbar buttons or ⌘Z / ⇧⌘Z. Undo expands a collapsed group and scrolls the row into view. If the row is hidden by search or filter, a banner says so — the committed value still updates.

**Tenant theme.** The header dropdown switches Default, Aurelia, and Meridian. Invalid or missing theme fields fall back per field so a bad customer config cannot crash the UI.

## Architecture

The UI is a thin shell. Domain work lives in hooks and pure functions so the virtualized list only renders what is already decided.

```
generateRows()
      │
      ▼
useHcpData          source roster (stable array)
      │
      ▼
useCallsEdits       committed Calls overlay, selection, undo
      │
      ▼
useGroupedRows      filter → group tree → sort → flatten
      │
      ▼
VirtualGrid         windowed rows (TanStack Virtual)
```

**Identity.** Displayed `id` is not unique in the seed. Selection, edits, and undo always key by **array index** in that source array, so sort, filter, and grouping never orphan a change.

**Edits vs display.** `workingRows` is the roster with committed Calls only. Pending drafts appear in the cell but are not rolled into group sums until validation succeeds.

**Grouping.** `buildGroupedTree` builds Region → Territory → leaves from filtered indices. `flattenVisibleRows` turns that tree into the list the virtualizer scrolls. Collapsed groups are a set of keys; the rest stay expanded by default.

**Theming.** `resolveTheme` sanitizes each tenant field independently, then `themeToCssVars` writes CSS variables (`--color-primary`, `--color-header`, `--radius`, …). Components never read hex values from the config object.

## Source layout

```
src/
├── provided/          Seed data, validator, tenant configs (treat as read-only)
├── components/        Grid, toolbar, footer, Calls cell
├── grouping/          Tree build, flatten, filter, sort
├── hooks/             Data, edits, grouping, tenant
├── theme/             Resolve + CSS variables
├── editing/           Edit command types
├── utils/             Calls parse, CPI, aggregates
└── App.tsx            Wires hooks to the shell
```

Stack: React 19, Vite, TypeScript, `@tanstack/react-virtual`.
