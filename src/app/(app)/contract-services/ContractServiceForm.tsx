'use client';

import { useActionState, useState, type ChangeEvent } from 'react';
import type { ContractServiceFormState } from './actions';

export type ContractService = {
  id: number;
  code: string;
  contract_id: number;
  service_id: number;
  uom_code: string;
  summary_calculation_type: string;
  start_date: string;
  end_date: string;
  timesheet_site_code: string | null;
};

export type ContractOption = {
  id: number;
  contract_number: string;
};

export type ServiceOption = {
  id: number;
  code: string;
  name: string;
  default_uom_code: string;
};

export type UomOption = {
  code: string;
  name: string;
};

export type SumCalcTypeOption = {
  code: string;
  name: string;
};

const initialState: ContractServiceFormState = { error: null };

export function ContractServiceForm({
  contractService,
  contracts,
  services,
  uoms,
  sumCalcTypes,
  action,
  submitLabel,
}: {
  contractService?: ContractService;
  contracts: ContractOption[];
  services: ServiceOption[];
  uoms: UomOption[];
  sumCalcTypes: SumCalcTypeOption[];
  action: (prevState: ContractServiceFormState, formData: FormData) => Promise<ContractServiceFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [uomCode, setUomCode] = useState(contractService?.uom_code ?? '');

  function handleServiceChange(event: ChangeEvent<HTMLSelectElement>) {
    const selectedService = services.find((service) => String(service.id) === event.target.value);
    if (selectedService) {
      setUomCode(selectedService.default_uom_code);
    }
  }

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="contract_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract
        </label>
        <select
          id="contract_id"
          name="contract_id"
          required
          defaultValue={contractService?.contract_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a contract
          </option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.contract_number}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="service_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Service
        </label>
        <select
          id="service_id"
          name="service_id"
          required
          defaultValue={contractService?.service_id ?? ''}
          onChange={handleServiceChange}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a service
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.code} — {service.name}
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
          defaultValue={contractService?.code}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="uom_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          UoM
        </label>
        <select
          id="uom_code"
          name="uom_code"
          required
          value={uomCode}
          onChange={(event) => setUomCode(event.target.value)}
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
        <label htmlFor="summary_calculation_type" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Summary calculation type
        </label>
        <select
          id="summary_calculation_type"
          name="summary_calculation_type"
          required
          defaultValue={contractService?.summary_calculation_type ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a calculation type
          </option>
          {sumCalcTypes.map((sumCalcType) => (
            <option key={sumCalcType.code} value={sumCalcType.code}>
              {sumCalcType.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="start_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Start date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            defaultValue={contractService?.start_date}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="end_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            End date
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            required
            defaultValue={contractService?.end_date}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="timesheet_site_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Timesheet site code
        </label>
        <input
          id="timesheet_site_code"
          name="timesheet_site_code"
          type="text"
          defaultValue={contractService?.timesheet_site_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
