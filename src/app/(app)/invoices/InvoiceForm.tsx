'use client';

import { useActionState } from 'react';
import type { InvoiceFormState } from './actions';

export type Invoice = {
  id: number;
  proforma_invoice_id: number;
  period_id: number;
  code: string;
  issue_date: string | null;
  tax_percentage: number | null;
};

export type PeriodOption = {
  id: number;
  name: string;
};

export type ProformaInvoiceOption = {
  id: number;
  code: string | null;
};

const initialState: InvoiceFormState = { error: null };

export function InvoiceForm({
  invoice,
  periods,
  proformaInvoices,
  action,
  submitLabel,
  readOnly = false,
  readOnlyMessage = 'Managers have read-only access.',
}: {
  invoice?: Invoice;
  periods: PeriodOption[];
  proformaInvoices: ProformaInvoiceOption[];
  action: (prevState: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  submitLabel: string;
  readOnly?: boolean;
  readOnlyMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="proforma_invoice_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Proforma invoice
        </label>
        <select
          id="proforma_invoice_id"
          name="proforma_invoice_id"
          required
          disabled={readOnly}
          defaultValue={invoice?.proforma_invoice_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a proforma invoice
          </option>
          {proformaInvoices.map((proformaInvoice) => (
            <option key={proformaInvoice.id} value={proformaInvoice.id}>
              {proformaInvoice.code ?? `Invoice #${proformaInvoice.id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="period_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Period
        </label>
        <select
          id="period_id"
          name="period_id"
          required
          disabled={readOnly}
          defaultValue={invoice?.period_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a period
          </option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          disabled={readOnly}
          defaultValue={invoice?.code}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="issue_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Issue date
          </label>
          <input
            id="issue_date"
            name="issue_date"
            type="date"
            disabled={readOnly}
            defaultValue={invoice?.issue_date ?? ''}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="tax_percentage" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tax percentage
          </label>
          <input
            id="tax_percentage"
            name="tax_percentage"
            type="number"
            step="any"
            min="0"
            disabled={readOnly}
            defaultValue={invoice?.tax_percentage ?? ''}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      {readOnly ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{readOnlyMessage}</p>
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
