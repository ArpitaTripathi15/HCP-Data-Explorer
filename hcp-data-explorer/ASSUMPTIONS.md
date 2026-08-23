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

## CPI (FR-7 preview)

**Formula:** `CPI = Calls ÷ TRx × 100`

**Undefined cases:** When `trx === 0` or `calls` cannot be parsed to a finite number, CPI displays `—` instead of `NaN`/`Infinity`.

## Sorting Semantics (FR-3 — planned)

_To be documented in Part 3._

## Edit Lifecycle (FR-4 — planned)

_To be documented in Part 4._
