import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PersonForm, type Person } from '../../PersonForm';
import { updatePerson, deactivatePerson, reactivatePerson } from '../../actions';

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

  let companies = companiesData ?? [];
  if (person.company_id && !companies.some((c) => c.id === person.company_id)) {
    const { data: currentCompany } = await supabase
      .from('company')
      .select('id, name')
      .eq('id', person.company_id)
      .maybeSingle();
    if (currentCompany) companies = [...companies, currentCompany];
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

  const staffTypes = staffTypesData ?? [];

  const { is_active } = person;
  const updatePersonWithId = updatePerson.bind(null, personId);
  const deactivatePersonWithId = deactivatePerson.bind(null, personId);
  const reactivatePersonWithId = reactivatePerson.bind(null, personId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit person
        </h2>
        <form action={is_active ? deactivatePersonWithId : reactivatePersonWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {is_active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
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
