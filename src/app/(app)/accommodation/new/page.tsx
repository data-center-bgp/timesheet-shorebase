import { PersonAccomodationForm } from '../PersonAccomodationForm';
import { createPersonAccomodation } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewAccommodationPage() {
  const supabase = await createClient();

  const { data: personsData, error: personsError } = await supabase
    .from('person')
    .select('id, name')
    .order('name', { ascending: true });

  if (personsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load persons: {personsError.message}
        </p>
      </div>
    );
  }

  const { data: contractServicesData, error: contractServicesError } = await supabase
    .from('contract_service')
    .select('id, code')
    .order('code', { ascending: true });

  if (contractServicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract services: {contractServicesError.message}
        </p>
      </div>
    );
  }

  const { data: roomTypesData, error: roomTypesError } = await supabase
    .from('room_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (roomTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load room types: {roomTypesError.message}
        </p>
      </div>
    );
  }

  const persons = personsData ?? [];
  const contractServices = contractServicesData ?? [];
  const roomTypes = roomTypesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add accommodation
      </h2>
      <PersonAccomodationForm
        persons={persons}
        contractServices={contractServices}
        roomTypes={roomTypes}
        action={createPersonAccomodation}
        submitLabel="Create accommodation"
      />
    </div>
  );
}
