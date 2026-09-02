'use client';

import { useActionState } from 'react';
import type { PersonFormState } from './actions';

export type Person = {
  id: number;
  name: string;
  company_id: number;
  staff_type_code: string;
  ended_at: string | null;
};

export type CompanyOption = {
  id: number;
  name: string;
};

export type StaffTypeOption = {
  code: string;
  name: string;
};

const initialState: PersonFormState = { error: null };

function toDatetimeLocalValue(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  // The write side sends the datetime-local input's value straight to
  // Postgres with no timezone offset, so it's stored as the literal typed
  // wall-clock numbers interpreted in the DB session's UTC timezone - not
  // a real instant conversion. Reading it back must undo that the same
  // literal way (UTC getters), not via the browser's local timezone, or
  // the displayed value drifts by the browser's UTC offset on every
  // re-fetch.
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function PersonForm({
  person,
  companies,
  staffTypes,
  action,
  submitLabel,
  readOnly = false,
}: {
  person?: Person;
  companies: CompanyOption[];
  staffTypes: StaffTypeOption[];
  action: (prevState: PersonFormState, formData: FormData) => Promise<PersonFormState>;
  submitLabel: string;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={person?.name}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="company_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Company
        </label>
        <select
          id="company_id"
          name="company_id"
          required
          defaultValue={person?.company_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a company
          </option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="staff_type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Staff type
        </label>
        <select
          id="staff_type_code"
          name="staff_type_code"
          required
          defaultValue={person?.staff_type_code ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a staff type
          </option>
          {staffTypes.map((staffType) => (
            <option key={staffType.code} value={staffType.code}>
              {staffType.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="ended_at" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Ended at
        </label>
        <input
          id="ended_at"
          name="ended_at"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(person?.ended_at ?? null)}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      {readOnly ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Managers have read-only access.</p>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
      )}
    </form>
  );
}
