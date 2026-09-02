'use client';

import { useActionState } from 'react';
import type { PersonAccomodationFormState } from './actions';

export type PersonAccomodation = {
  id: number;
  person_id: number;
  contract_service_id: number;
  room_type_code: string;
  count: number;
  start_date: string;
  end_date: string;
};

export type PersonOption = {
  id: number;
  name: string;
};

export type ContractServiceOption = {
  id: number;
  code: string;
};

export type RoomTypeOption = {
  code: string;
  name: string;
};

const initialState: PersonAccomodationFormState = { error: null };

export function PersonAccomodationForm({
  accomodation,
  persons,
  contractServices,
  roomTypes,
  action,
  submitLabel,
  readOnly = false,
}: {
  accomodation?: PersonAccomodation;
  persons: PersonOption[];
  contractServices: ContractServiceOption[];
  roomTypes: RoomTypeOption[];
  action: (prevState: PersonAccomodationFormState, formData: FormData) => Promise<PersonAccomodationFormState>;
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
          defaultValue={accomodation?.person_id ?? ''}
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
          defaultValue={accomodation?.contract_service_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a contract service
          </option>
          {contractServices.map((contractService) => (
            <option key={contractService.id} value={contractService.id}>
              {contractService.code}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="room_type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Room type
        </label>
        <select
          id="room_type_code"
          name="room_type_code"
          required
          defaultValue={accomodation?.room_type_code ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a room type
          </option>
          {roomTypes.map((roomType) => (
            <option key={roomType.code} value={roomType.code}>
              {roomType.name}
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
          defaultValue={accomodation?.count}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
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
            defaultValue={accomodation?.start_date}
            disabled={readOnly}
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
            defaultValue={accomodation?.end_date}
            disabled={readOnly}
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
