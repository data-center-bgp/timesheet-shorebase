'use client';

import { useActionState } from 'react';
import type { InvoiceComponentFormState } from './actions';

export type InvoiceComponent = {
  id: number;
  invoice_id: number;
  contract_service_id: number;
  shorebase_service_id: number;
  company_id: number;
  uom_code: string;
  price_per_uom_contract: number | null;
  price_per_uom_independent: number | null;
  actual_price_per_uom: number | null;
  agg_amount: number | null;
  remark: string | null;
};

export type InvoiceOption = {
  id: number;
  label: string;
};

export type ContractServiceOption = {
  id: number;
  code: string;
  shorebase_service: { name: string } | null;
};

export type ShorebaseServiceOption = {
  id: number;
  code: string;
  name: string;
};

export type CompanyOption = {
  id: number;
  name: string;
};

export type UomOption = {
  code: string;
  name: string;
};

const initialState: InvoiceComponentFormState = { error: null };

export function InvoiceComponentForm({
  invoiceComponent,
  invoices,
  contractServices,
  shorebaseServices,
  companies,
  uoms,
  action,
  submitLabel,
  readOnly = false,
  readOnlyMessage = 'Managers have read-only access.',
}: {
  invoiceComponent?: InvoiceComponent;
  invoices: InvoiceOption[];
  contractServices: ContractServiceOption[];
  shorebaseServices: ShorebaseServiceOption[];
  companies: CompanyOption[];
  uoms: UomOption[];
  action: (prevState: InvoiceComponentFormState, formData: FormData) => Promise<InvoiceComponentFormState>;
  submitLabel: string;
  readOnly?: boolean;
  readOnlyMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="invoice_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Invoice
        </label>
        <select
          id="invoice_id"
          name="invoice_id"
          required
          disabled={readOnly}
          defaultValue={invoiceComponent?.invoice_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select an invoice
          </option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="contract_service_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract service
        </label>
        <select
          id="contract_service_id"
          name="contract_service_id"
          required
          disabled={readOnly}
          defaultValue={invoiceComponent?.contract_service_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a contract service
          </option>
          {contractServices.map((contractService) => (
            <option key={contractService.id} value={contractService.id}>
              {`${contractService.code} — ${contractService.shorebase_service?.name ?? '—'}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="shorebase_service_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Service
        </label>
        <select
          id="shorebase_service_id"
          name="shorebase_service_id"
          required
          disabled={readOnly}
          defaultValue={invoiceComponent?.shorebase_service_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a service
          </option>
          {shorebaseServices.map((service) => (
            <option key={service.id} value={service.id}>
              {service.code} — {service.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="company_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Company
        </label>
        <select
          id="company_id"
          name="company_id"
          required
          disabled={readOnly}
          defaultValue={invoiceComponent?.company_id ?? ''}
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
        <label htmlFor="uom_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          UoM
        </label>
        <select
          id="uom_code"
          name="uom_code"
          required
          disabled={readOnly}
          defaultValue={invoiceComponent?.uom_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a UoM
          </option>
          {uoms.map((uom) => (
            <option key={uom.code} value={uom.code}>
              {uom.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label
            htmlFor="price_per_uom_contract"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Price per UoM (contract)
          </label>
          <input
            id="price_per_uom_contract"
            name="price_per_uom_contract"
            type="number"
            step="any"
            min="0"
            disabled={readOnly}
            defaultValue={invoiceComponent?.price_per_uom_contract ?? ''}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="price_per_uom_independent"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Price per UoM (independent)
          </label>
          <input
            id="price_per_uom_independent"
            name="price_per_uom_independent"
            type="number"
            step="any"
            min="0"
            disabled={readOnly}
            defaultValue={invoiceComponent?.price_per_uom_independent ?? ''}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="actual_price_per_uom" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Actual price per UoM
          </label>
          <input
            id="actual_price_per_uom"
            name="actual_price_per_uom"
            type="number"
            step="any"
            min="0"
            disabled={readOnly}
            defaultValue={invoiceComponent?.actual_price_per_uom ?? ''}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="agg_amount" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Aggregate amount
          </label>
          <input
            id="agg_amount"
            name="agg_amount"
            type="number"
            step="1"
            min="0"
            disabled={readOnly}
            defaultValue={invoiceComponent?.agg_amount ?? ''}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="remark" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Remark
        </label>
        <textarea
          id="remark"
          name="remark"
          rows={3}
          disabled={readOnly}
          defaultValue={invoiceComponent?.remark ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
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
