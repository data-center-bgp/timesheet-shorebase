'use client';

import { useActionState } from 'react';
import type { MaterialHandlingItemFormState } from './actions';

export type MaterialHandlingItem = {
  id: number;
  job_id: number;
  product_id: number;
  quantity: number;
  uom: string;
  unit_size: number | null;
};

export type JobOption = {
  id: number;
  name: string;
};

export type ProductOption = {
  id: number;
  name: string;
};

export type UomOption = {
  code: string;
  name: string;
};

const initialState: MaterialHandlingItemFormState = { error: null };

export function MaterialHandlingItemForm({
  item,
  jobs,
  products,
  uoms,
  action,
  submitLabel,
  readOnly = false,
}: {
  item?: MaterialHandlingItem;
  jobs: JobOption[];
  products: ProductOption[];
  uoms: UomOption[];
  action: (prevState: MaterialHandlingItemFormState, formData: FormData) => Promise<MaterialHandlingItemFormState>;
  submitLabel: string;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="job_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job
        </label>
        <select
          id="job_id"
          name="job_id"
          required
          disabled={readOnly}
          defaultValue={item?.job_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a job
          </option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="product_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Product
        </label>
        <select
          id="product_id"
          name="product_id"
          required
          disabled={readOnly}
          defaultValue={item?.product_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a product
          </option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="quantity" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Quantity
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          step="any"
          min="0"
          required
          disabled={readOnly}
          defaultValue={item?.quantity}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="uom" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          UoM
        </label>
        <select
          id="uom"
          name="uom"
          required
          disabled={readOnly}
          defaultValue={item?.uom ?? ''}
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

      <div className="space-y-1">
        <label htmlFor="unit_size" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Unit size
        </label>
        <input
          id="unit_size"
          name="unit_size"
          type="number"
          step="any"
          min="0"
          disabled={readOnly}
          defaultValue={item?.unit_size ?? ''}
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
