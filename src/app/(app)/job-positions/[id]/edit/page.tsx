import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobPositionForm, type JobPosition } from '../../JobPositionForm';
import { updateJobPosition, deactivateJobPosition, reactivateJobPosition } from '../../actions';

export default async function EditJobPositionPage(props: PageProps<'/job-positions/[id]/edit'>) {
  const { id } = await props.params;
  const jobPositionId = Number(id);

  if (Number.isNaN(jobPositionId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: jobPosition, error } = await supabase
    .from('job_position')
    .select('id, company_id, job_title_id, parent_position_id, name, start_date, end_date, active')
    .eq('id', jobPositionId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job position: {error.message}
        </p>
      </div>
    );
  }

  if (!jobPosition) {
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

  const { data: jobTitlesData, error: jobTitlesError } = await supabase
    .from('job_title')
    .select('id, name')
    .order('name', { ascending: true });

  if (jobTitlesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job titles: {jobTitlesError.message}
        </p>
      </div>
    );
  }

  const { data: parentPositionsData, error: parentPositionsError } = await supabase
    .from('job_position')
    .select('id, name')
    .order('name', { ascending: true });

  if (parentPositionsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load parent positions: {parentPositionsError.message}
        </p>
      </div>
    );
  }

  const companies = companiesData ?? [];
  const jobTitles = jobTitlesData ?? [];
  // Exclude this position from its own "Parent position" dropdown — a
  // position can never be selected as its own parent. See actions.ts's
  // updateJobPosition for the server-side backstop of the same rule.
  const parentPositionOptions = (parentPositionsData ?? []).filter(
    (position) => position.id !== jobPositionId,
  );

  const { active } = jobPosition;
  const updateJobPositionWithId = updateJobPosition.bind(null, jobPositionId);
  const deactivateJobPositionWithId = deactivateJobPosition.bind(null, jobPositionId);
  const reactivateJobPositionWithId = reactivateJobPosition.bind(null, jobPositionId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit job position
        </h2>
        <form action={active ? deactivateJobPositionWithId : reactivateJobPositionWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <JobPositionForm
        jobPosition={jobPosition as JobPosition}
        companies={companies}
        jobTitles={jobTitles}
        parentPositionOptions={parentPositionOptions}
        action={updateJobPositionWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
