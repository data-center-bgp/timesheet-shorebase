import { PersonForm } from '../PersonForm';
import { createPerson } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewPersonPage() {
  const supabase = await createClient();

  const { data: companiesData, error: companiesError } = await supabase
    .from('company')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true });

  if (companiesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load companies: {companiesError.message}
        </p>
      </div>
    );
  }

  const { data: staffTypesData, error: staffTypesError } = await supabase
    .from('staff_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (staffTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load staff types: {staffTypesError.message}
        </p>
      </div>
    );
  }

  const companies = companiesData ?? [];
  const staffTypes = staffTypesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add person
      </h2>
      <PersonForm
        companies={companies}
        staffTypes={staffTypes}
        action={createPerson}
        submitLabel="Create person"
      />
    </div>
  );
}
