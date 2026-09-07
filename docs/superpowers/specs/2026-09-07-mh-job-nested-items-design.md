# Material Handling Job — nested Items/Equipment view design spec

## Problem

Adding a Material Handling Item or Equipment record requires picking its
parent Job from a dropdown — fine today, but the dropdown will become
unwieldy as the number of Jobs grows. Confirmed with the project owner:
apply the same fix to both Items and Equipment (identical shape, identical
problem), and keep it lightweight rather than building full inline
CRUD — the first nested/master-detail UI in this codebase, so minimize
new surface area.

## Design (confirmed: "lightweight" option)

On `material-handling-jobs/[id]/edit/page.tsx`, add two new read-only
sections below the existing Job form — **Items** and **Equipment** — each
showing that Job's own child rows as a list of native `<details>`
disclosures (no client JS needed — matches this app's existing
zero-client-complexity convention). Each `<summary>` shows a compact
one-line label (Item: `{product name} — {quantity} {uom name}`;
Equipment: `{equipment code} — {equipment name}`) plus an Active/Inactive
badge; the expanded body shows the remaining fields (Item: unit size;
Equipment: nothing further, it only ever had the FK) and an "Edit →" link
to that record's existing flat edit page. An "+ Add item" / "+ Add
equipment" link at the top of each section goes to
`/material-handling-items/new?job_id={id}` (or the equipment equivalent).

**Editing and deactivating still happen on the existing flat edit pages**
(`/material-handling-items/{id}/edit`, `/material-handling-equipment/
{id}/edit`) — unchanged, no new redirect-back behavior there, per the
agreed scope. Only the **create** flow changes: reached via the Job page,
it pre-selects the Job in the dropdown and returns to the Job's edit page
on success instead of the flat list.

## Mechanics

- **Pre-select via query param**: `new/page.tsx` (both Item and
  Equipment) reads `job_id` from `searchParams`. If present and valid,
  it's threaded into the form component as a new `defaultJobId?: number`
  prop, used as the Job `<select>`'s `defaultValue` fallback (`item?.job_id
  ?? defaultJobId ?? ''`) — the dropdown itself stays exactly as-is (still
  shows every active Job, still changeable), just pre-selected instead of
  blank.
- **Return-to redirect**: the same `new/page.tsx` also passes a
  `returnTo?: string` prop when `job_id` is present, set to
  `/material-handling-jobs/{job_id}/edit`. The form component renders it
  as a hidden `<input type="hidden" name="return_to" value={returnTo} />`
  when provided. `createMaterialHandlingItem`/`createMaterialHandlingEquipment`
  read `return_to` from `formData`; if present, `revalidatePath` **both**
  that path and the feature's own list path, then `redirect` there instead
  of the flat list. If absent (the standalone `/material-handling-items/new`
  flow, no query param), behavior is completely unchanged.
- **No migration, no new routes, no new tables** — purely additive
  read-only sections plus one optional query param on an existing route.

## Non-goals

- No inline add/edit/remove *within* the Job page itself — that's the
  "full inline management" option that was explicitly not chosen.
- No change to Deactivate/Reactivate anywhere.
- The standalone `/material-handling-items` and `/material-handling-equipment`
  list pages are untouched — they remain the global cross-job view.
