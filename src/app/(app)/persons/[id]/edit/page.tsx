import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PersonForm, type Person } from '../../PersonForm';
import { updatePerson } from '../../actions';

export default async function EditPersonPage(props: PageProps<'/persons/[id]/edit'>) {
  const { id } = await props.params;
  const personId = Number(id);

  if (Number.isNaN(personId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: person, error } = await supabase
    .from('person')
    .select('id, name, company_id, staff_type_code, ended_at, is_active')
    .eq('id', personId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load person: {error.message}
        </p>
      </div>
    );
  }

  if (!person) {
    notFound();
  }

  const { data: companiesData, error: companiesError } = await supabase
    .from('company')
    .select('id, name')
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

  const updatePersonWithId = updatePerson.bind(null, personId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit person
      </h2>
      <PersonForm
        person={person as Person}
        companies={companies}
        staffTypes={staffTypes}
        action={updatePersonWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
