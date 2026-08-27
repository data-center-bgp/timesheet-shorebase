import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobPositionForm, type JobPosition } from '../../JobPositionForm';
import { updateJobPosition } from '../../actions';

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

  const updateJobPositionWithId = updateJobPosition.bind(null, jobPositionId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit job position
      </h2>
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
