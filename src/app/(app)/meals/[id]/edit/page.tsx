import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PersonMealForm, type PersonMeal } from '../../PersonMealForm';
import { updatePersonMeal } from '../../actions';

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

  const persons = personsData ?? [];
  const contractServices = contractServicesData ?? [];
  const mealTimes = mealTimesData ?? [];

  const updatePersonMealWithId = updatePersonMeal.bind(null, mealId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit meal
      </h2>
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
