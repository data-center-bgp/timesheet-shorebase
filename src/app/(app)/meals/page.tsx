import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type PersonMealRow = {
  id: number;
  count: number;
  meal_date: string;
  active: boolean;
  person: { name: string } | null;
  contract_service: { code: string } | null;
  meal_time: { name: string } | null;
};

export default async function MealsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person_meal')
    .select('id, count, meal_date, active, person(name), contract_service(code), meal_time(name)')
    .order('meal_date', { ascending: true });

  const meals = (data ?? []) as unknown as PersonMealRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            PEOPLE
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Meals
          </h2>
        </div>
        <Link
          href="/meals/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add meal
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load meal records: {error.message}
        </p>
      )}

      {!error && meals.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No meal records yet. Add your first one to get started.
        </p>
      )}

      {!error && meals.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Person</th>
                <th className="px-4 py-2">Contract Service</th>
                <th className="px-4 py-2">Meal Time</th>
                <th className="px-4 py-2">Count</th>
                <th className="px-4 py-2">Meal date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {meals.map((meal) => {
                const { active } = meal;
                return (
                  <tr key={meal.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/meals/${meal.id}/edit`} className="hover:underline">
                        {meal.person?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {meal.contract_service?.code ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {meal.meal_time?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{meal.count}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{meal.meal_date}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          active
                            ? 'rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                            : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }
                      >
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
