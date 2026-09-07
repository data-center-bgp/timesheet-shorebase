'use client';

import { useActionState } from 'react';
import type { PersonMealFormState } from './actions';

export type PersonMeal = {
  id: number;
  person_id: number;
  contract_service_id: number;
  meal_time_code: string;
  count: number;
  meal_date: string;
};

export type PersonOption = {
  id: number;
  name: string;
};

export type ContractServiceOption = {
  id: number;
  code: string;
  shorebase_service: { name: string } | null;
};

export type MealTimeOption = {
  code: string;
  name: string;
};

const initialState: PersonMealFormState = { error: null };

export function PersonMealForm({
  meal,
  persons,
  contractServices,
  mealTimes,
  action,
  submitLabel,
  readOnly = false,
}: {
  meal?: PersonMeal;
  persons: PersonOption[];
  contractServices: ContractServiceOption[];
  mealTimes: MealTimeOption[];
  action: (prevState: PersonMealFormState, formData: FormData) => Promise<PersonMealFormState>;
  submitLabel: string;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="person_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Person
        </label>
        <select
          id="person_id"
          name="person_id"
          required
          defaultValue={meal?.person_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a person
          </option>
          {persons.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
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
          defaultValue={meal?.contract_service_id ?? ''}
          disabled={readOnly}
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
        <label htmlFor="meal_time_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Meal time
        </label>
        <select
          id="meal_time_code"
          name="meal_time_code"
          required
          defaultValue={meal?.meal_time_code ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a meal time
          </option>
          {mealTimes.map((mealTime) => (
            <option key={mealTime.code} value={mealTime.code}>
              {mealTime.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="count" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Count
        </label>
        <input
          id="count"
          name="count"
          type="number"
          min="1"
          step="1"
          required
          defaultValue={meal?.count}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="meal_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Meal date
        </label>
        <input
          id="meal_date"
          name="meal_date"
          type="date"
          required
          defaultValue={meal?.meal_date}
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
