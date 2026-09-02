import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PersonAccomodationForm, type PersonAccomodation } from '../../PersonAccomodationForm';
import { updatePersonAccomodation, deactivatePersonAccomodation, reactivatePersonAccomodation } from '../../actions';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function EditAccommodationPage(props: PageProps<'/accommodation/[id]/edit'>) {
  const isManager = await isManagerRole();
  const { id } = await props.params;
  const accomodationId = Number(id);

  if (Number.isNaN(accomodationId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: accomodation, error } = await supabase
    .from('person_accomodation')
    .select('id, person_id, contract_service_id, room_type_code, count, start_date, end_date, active')
    .eq('id', accomodationId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load accommodation record: {error.message}
        </p>
      </div>
    );
  }

  if (!accomodation) {
    notFound();
  }

  const { data: personsData, error: personsError } = await supabase
    .from('person')
    .select('id, name')
    .eq('is_active', true)
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

  let persons = personsData ?? [];
  if (accomodation.person_id && !persons.some((p) => p.id === accomodation.person_id)) {
    const { data: currentPerson } = await supabase
      .from('person')
      .select('id, name')
      .eq('id', accomodation.person_id)
      .maybeSingle();
    if (currentPerson) persons = [...persons, currentPerson];
  }

  const { data: contractServicesData, error: contractServicesError } = await supabase
    .from('contract_service')
    .select('id, code')
    .eq('active', true)
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

  let contractServices = contractServicesData ?? [];
  if (
    accomodation.contract_service_id &&
    !contractServices.some((cs) => cs.id === accomodation.contract_service_id)
  ) {
    const { data: currentContractService } = await supabase
      .from('contract_service')
      .select('id, code')
      .eq('id', accomodation.contract_service_id)
      .maybeSingle();
    if (currentContractService) contractServices = [...contractServices, currentContractService];
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

  const roomTypes = roomTypesData ?? [];

  const { active } = accomodation;
  const updatePersonAccomodationWithId = updatePersonAccomodation.bind(null, accomodationId);
  const deactivatePersonAccomodationWithId = deactivatePersonAccomodation.bind(null, accomodationId);
  const reactivatePersonAccomodationWithId = reactivatePersonAccomodation.bind(null, accomodationId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit accommodation
        </h2>
        {!isManager && (
          <form action={active ? deactivatePersonAccomodationWithId : reactivatePersonAccomodationWithId}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {active ? 'Deactivate' : 'Reactivate'}
            </button>
          </form>
        )}
      </div>
      <PersonAccomodationForm
        accomodation={accomodation as PersonAccomodation}
        persons={persons}
        contractServices={contractServices}
        roomTypes={roomTypes}
        action={updatePersonAccomodationWithId}
        submitLabel="Save changes"
        readOnly={isManager}
      />
    </div>
  );
}
