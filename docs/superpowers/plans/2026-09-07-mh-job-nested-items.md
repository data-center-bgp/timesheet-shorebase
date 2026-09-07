# MH Job nested Items/Equipment view — implementation plan

Spec: `docs/superpowers/specs/2026-09-07-mh-job-nested-items-design.md` —
read it fully first.

**Files to modify (7):**
- `src/app/(app)/material-handling-jobs/[id]/edit/page.tsx`
- `src/app/(app)/material-handling-items/new/page.tsx`
- `src/app/(app)/material-handling-items/MaterialHandlingItemForm.tsx`
- `src/app/(app)/material-handling-items/actions.ts`
- `src/app/(app)/material-handling-equipment/new/page.tsx`
- `src/app/(app)/material-handling-equipment/MaterialHandlingEquipmentForm.tsx`
- `src/app/(app)/material-handling-equipment/actions.ts`

No new files, no migration.

## Task 1 — Job page: add the two read-only nested sections

In `material-handling-jobs/[id]/edit/page.tsx`, after the existing Job
fetch, add two more queries:

```ts
const { data: itemsData } = await supabase
  .from('material_handling_item')
  .select('id, product(name), quantity, uom(name), unit_size, active')
  .eq('job_id', jobId)
  .order('id', { ascending: true });

const { data: equipmentData } = await supabase
  .from('material_handling_equipment')
  .select('id, equipment(code, name), active')
  .eq('job_id', jobId)
  .order('id', { ascending: true });
```

(Both are normal, non-self-referential embeds — target-table-name form,
no alias, matching every other embed in this codebase. Cast with `as
unknown as {...}[]` the same way every other embedded query in this
feature already does — see the existing `contractServices`/`subcontractors`
casts a few lines above for the exact style to match.)

Render two new sections below `<MaterialHandlingJobForm ... />`, each:

```tsx
<div className="mt-8">
  <div className="flex items-center justify-between">
    <p className="font-mono text-xs font-medium tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
      ITEMS
    </p>
    <Link href={`/material-handling-items/new?job_id=${jobId}`} className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400">
      + Add item
    </Link>
  </div>
  {items.length === 0 ? (
    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No items yet.</p>
  ) : (
    <div className="mt-2 space-y-2">
      {items.map((item) => (
        <details key={item.id} className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <summary className="flex cursor-pointer items-center justify-between text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {item.product?.name ?? '—'} — {item.quantity} {item.uom?.name ?? '—'}
            </span>
            <span className={item.active ? 'rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300' : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}>
              {item.active ? 'Active' : 'Inactive'}
            </span>
          </summary>
          <div className="mt-2 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
            <span>Unit size: {item.unit_size ?? '—'}</span>
            <Link href={`/material-handling-items/${item.id}/edit`} className="font-medium text-teal-700 hover:underline dark:text-teal-400">
              Edit →
            </Link>
          </div>
        </details>
      ))}
    </div>
  )}
</div>
```

Same shape for Equipment (`EQUIPMENT` label, summary
`{equipment.code} — {equipment.name}`, no extra body fields beyond the
Edit link, "+ Add equipment" → `/material-handling-equipment/new?job_id=
{jobId}`). Import `Link` from `next/link` at the top of the file (not
currently imported there — check first, don't duplicate the import if it
somehow already exists).

Verify: navigate to the real "Cargo Unloading - Vessel MT Grace" job's
edit page (created earlier this session, already has one Item and one
Equipment row) — confirm both sections render, each summary expands to
show the extra detail + Edit link, and the Edit link goes to the correct
existing edit page.

## Task 2 — Item's create flow: pre-select + return-to

**`MaterialHandlingItemForm.tsx`**: add `defaultJobId?: number` and
`returnTo?: string` to the props type. Change the Job `<select>`'s
`defaultValue` to `item?.job_id ?? defaultJobId ?? ''`. Add, just before
the closing `</form>` (or anywhere inside the `<form>`, position doesn't
matter for a hidden field):
```tsx
{returnTo && <input type="hidden" name="return_to" value={returnTo} />}
```

**`new/page.tsx`**: accept `searchParams` (Next.js 16 App Router:
`props: PageProps<'/material-handling-items/new'>` if that generated type
already includes `searchParams`, otherwise type it explicitly as
`{ searchParams: Promise<{ job_id?: string }> }` — check what
`PageProps<'/material-handling-jobs/[id]/edit'>` looks like elsewhere in
this codebase for the convention, but this route has no dynamic segment
so confirm the generated type actually carries `searchParams` before
relying on it). Await it, parse `job_id` as a number if present and valid.
Pass `defaultJobId={jobId}` and `returnTo={jobId ? \`/material-handling-jobs/${jobId}/edit\` : undefined}`
to `MaterialHandlingItemForm`.

**`actions.ts`**: in `createMaterialHandlingItem`, after the successful
insert, replace the hardcoded redirect:
```ts
const returnTo = (formData.get('return_to') as string | null)?.trim() || '/material-handling-items';
revalidatePath('/material-handling-items');
revalidatePath(returnTo);
redirect(returnTo);
```
Leave `updateMaterialHandlingItem`/`deactivateMaterialHandlingItem`/
`reactivateMaterialHandlingItem` completely untouched — editing/
deactivating stays on the flat page, per the spec's non-goals.

Verify: from the Job's edit page, click "+ Add item", confirm the Job
dropdown arrives pre-selected to that Job, submit a new item, confirm it
redirects back to the Job's edit page (not the flat `/material-handling-items`
list) and the new item appears in the Items section. Then separately
verify `/material-handling-items/new` with NO query param still works
exactly as before (blank dropdown, redirects to the flat list on submit).

## Task 3 — Equipment's create flow: identical treatment

Mirror Task 2 exactly for `material-handling-equipment/{new/page.tsx,
MaterialHandlingEquipmentForm.tsx, actions.ts}` — same `defaultJobId`/
`returnTo` props, same `return_to` hidden field, same
`createMaterialHandlingEquipment` redirect change. Verify the same way
(pre-selected dropdown, redirect back to Job page, plain `/material-
handling-equipment/new` still works unchanged).

## Verification (whole feature)

1. `npm run lint` / `npm run build` clean.
2. Live click-through covering both entry points (from the Job page, and
   directly via each feature's own nav item) for both Items and
   Equipment, as described in Tasks 1–3.
3. No test data cleanup needed beyond whatever throwaway rows verification
   itself creates — check with the user before deleting anything, since
   this project has been keeping real workflow-test data in place recently
   rather than always cleaning up.

## Commit

One commit: "Add nested Items/Equipment view to Material Handling Job,
pre-select + return-to on create".
