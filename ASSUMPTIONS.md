# Assumptions & Data Quality Decisions

This document records every data-quality issue found in the seeded dataset and how the app handles it. Updated as features are built.

## Row Identity

**Issue:** `HcpRecord.id` is **not unique** — every 9,973rd row reuses the previous row's ID.

**Decision:** Use **array index** as the canonical row key for selection, edits, and undo. Display the `id` field as-is in the grid.

## Data Quality Issues (from `generateRows`)

| Issue | Frequency | Handling (Part 1) |
|-------|-----------|-------------------|
| Duplicate HCP IDs | Every 9,973 rows | Row key = index; ID shown as stored |
| `specialty: null` | Every 97 rows | Render as em dash (`—`), italic/muted style |
| `calls` as string | Every 211 rows | Display string as stored; parse with `Number()` for CPI math |
| `calls = 99999` outlier | Every 12,007 rows | Display as-is; will fail validation cap (60) on edit (FR-4) |
| `trx = 0` | Every 577 rows | CPI shows `—` (division by zero avoided) |

## CPI (FR-7)

**Row formula:** `CPI = Calls ÷ TRx × 100`

**Undefined (row):** When `trx === 0` or `calls` cannot be parsed to a finite number, CPI displays `—` instead of `NaN`/`Infinity`.

**Group formula:** `CPI = Σ Calls ÷ Σ TRx × 100` (ratio of sums, not average of row CPIs).

**Undefined (group):** When `Σ TRx === 0`, group CPI displays `—`.

## Grouping & Aggregation (FR-2)

**Structure:** Region → Territory → HCP rows. Default: all groups expanded. Expand/collapse is tracked as a set of *collapsed* keys.

**Σ Calls:** Coerce `calls` with `Number()`. Non-finite values contribute `0` to the sum (still counted in HCP count). String numerics and outliers (99999) are included as-is — not sanitized.

**Σ TRx / Σ NRx:** Plain numeric sums.

**HCP count:** Leaf rows in the group (array indices under that territory/region).

**Pending edits (FR-4):** Aggregates use `workingRows` with **committed** Calls only. In-flight (pending) values are shown in the cell but excluded from Σ until validation succeeds.

## Search, Filter & Sorting (FR-3)

### Search
- Case-insensitive substring on **name** or **id**.
- Pipeline: filter indices → rebuild group tree → flatten.
- Non-empty search **auto-expands** all groups in the filtered tree (user may collapse afterward).
- Search input is deferred (`useDeferredValue`) so typing stays responsive over 50k rows.

### Region filter
- Exact match on `region`. Empty = all regions.
- Combines with search (AND). Aggregates reflect the filtered subset only.

### Sort (three-state: asc → desc → none)
- Click column header to cycle. Indicator shows ↑ / ↓ when active.
- **Within each territory:** leaves sorted by that column; ties broken by source **array index** (stable).
- **Numeric columns** (`calls`, `trx`, `nrx`, `cpi`): regions and territories reorder by their **aggregate** for that column. Tie-break: group label alphabetically.
- **Text columns:** leaves sort within territories; groups stay alphabetical by label except when sorting `region` / `territory`, which reorder those labels.

### Values that do not compare cleanly

| Value | Sort behavior |
|-------|----------------|
| `specialty: null` | Always **last** (asc and desc) |
| Non-finite `calls` after parse | Always **last** |
| Undefined row/group CPI | Always **last** |
| String `calls` that parse | Sorted by numeric value |
| Duplicate `id` | Tie-break by array index |

## Edit Lifecycle (FR-4)

### Cell states
`idle → editing → pending → idle` (saved) **or** `rejected` (then idle after dismiss / re-edit).

- **Edit:** click Calls cell (or focus + activate). Enter commits; Escape cancels; blur commits.
- **Pending:** cell shows draft + spinner, **locked** against further edits. Aggregates unchanged.
- **Saved:** committed override applied by **array index**; undo command pushed; aggregates rebuild.
- **Rejected:** draft discarded; previous committed value restored in the cell; banner + cell highlight show the validator reason (cap / 503 / parse error).

### Edit while previous commit in flight
**Locked.** `beginEdit` returns false while status is `pending`. No queueing; user must wait for settle. Late `validateCalls` results ignored via per-row request token.

### Undo / redo
- **Command history** of `EditCommand`: single `{ kind:'single', rowIndex, before, after }` or bulk `{ kind:'bulk', changes[] }` — not full-grid snapshots.
- Undo/redo apply locally by index (**no re-validation**).
- Works under any sort/filter/group because identity is array index.
- Undo/redo of a command that touches a currently `pending` row is a no-op until validation finishes.
- New successful edit/bulk clears the redo stack.

### Data-quality interactions
- String `calls` parse to number for editing; accepted edits store a **number**.
- Outlier `99999` fails the call cap (60) via `validateCalls`.
- No-op commits (same numeric value) exit editing without calling the validator.

## Bulk edit (FR-5)

- Selection: per-HCP checkbox or per-territory checkbox (selects all leaf indices in that territory).
- **+10% calls** = `Math.round(committedCalls * 1.1)` for each selected row; validates concurrently via `Promise.all` + `validateCalls`.
- Rows already `pending` are skipped.
- Banner: “N applied, M rejected” with sample reasons.
- Successful subset is **one** `kind:'bulk'` undo command.

## Undo at scale (FR-6)

- **Collapsed group:** on undo/redo, expand the row’s region + territory, scroll into view, flash highlight.
- **Filtered out:** committed still updates by index; info banner names hidden rows / suggests clearing filter.
- **Redo:** local re-apply only (no `validateCalls`) — deterministic redo.
- **Pending:** undo/redo blocked while any touched row is pending.

## Runtime theming (FR-8)

- Tenant switch: header dropdown and `?tenant=aurelia` / `?tenant=meridian` (no rebuild).
- Unknown tenant or missing `tenant` → `DEFAULT_THEME`.
- **Per-field fallback:** each config field is validated independently. Invalid hex (`#ZZ8800`), missing `onPrimary`/`text`, or non-numeric radius (`"huge"`) use `DEFAULT_THEME` for that field only.
- Meridian still shows **app name** “Meridian 360” and valid background/surface; primary/radius/onPrimary/text come from default.
- Pending vs rejected cells use **semantic tokens** (teal bar vs red bar), not tenant `primary`, so they stay distinct under every provided theme.
- **Header chrome (demo):** provided `primary` is the same (or falls back to the same) for all tenants, so header uses `--color-header`: Default `#0B5FA5`, Aurelia teal `#157A6E`, Meridian light yellow `#F5E6A8`. Grid `background` / `surface` still come from resolved theme.
