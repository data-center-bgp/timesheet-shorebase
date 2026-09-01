import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PersonMealForm, type PersonMeal } from '../../PersonMealForm';
import { updatePersonMeal, deactivatePersonMeal, reactivatePersonMeal } from '../../actions';

export default async function EditMealPage(props: PageProps<'/meals/[id]/edit'>) {
  const { id } = await props.params;
  const mealId = Number(id);

  if (Number.isNaN(mealId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: meal, error } = await supabase
    .from('person_meal')
    .select('id, person_id, contract_service_id, meal_time_code, count, meal_date, active')
    .eq('id', mealId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load meal record: {error.message}
        </p>
      </div>
    );
  }

  if (!meal) {
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
  if (meal.person_id && !persons.some((p) => p.id === meal.person_id)) {
    const { data: currentPerson } = await supabase
      .from('person')
      .select('id, name')
      .eq('id', meal.person_id)
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
    meal.contract_service_id &&
    !contractServices.some((cs) => cs.id === meal.contract_service_id)
  ) {
    const { data: currentContractService } = await supabase
      .from('contract_service')
      .select('id, code')
      .eq('id', meal.contract_service_id)
      .maybeSingle();
    if (currentContractService) contractServices = [...contractServices, currentContractService];
  }

  const { data: mealTimesData, error: mealTimesError } = await supabase
    .from('meal_time')
    .select('code, name')
    .order('name', { ascending: true });

  if (mealTimesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load meal times: {mealTimesError.message}
        </p>
      </div>
    );
  }

  const mealTimes = mealTimesData ?? [];

  const { active } = meal;
  const updatePersonMealWithId = updatePersonMeal.bind(null, mealId);
  const deactivatePersonMealWithId = deactivatePersonMeal.bind(null, mealId);
  const reactivatePersonMealWithId = reactivatePersonMeal.bind(null, mealId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit meal
        </h2>
        <form action={active ? deactivatePersonMealWithId : reactivatePersonMealWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <PersonMealForm
        meal={meal as PersonMeal}
        persons={persons}
        contractServices={contractServices}
        mealTimes={mealTimes}
        action={updatePersonMealWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
