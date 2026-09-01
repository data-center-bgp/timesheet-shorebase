import { JobPositionForm } from '../JobPositionForm';
import { createJobPosition } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewJobPositionPage() {
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

  const { data: jobTitlesData, error: jobTitlesError } = await supabase
    .from('job_title')
    .select('id, name')
    .eq('active', true)
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
    .eq('active', true)
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
  const parentPositionOptions = parentPositionsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add job position
      </h2>
      <JobPositionForm
        companies={companies}
        jobTitles={jobTitles}
        parentPositionOptions={parentPositionOptions}
        action={createJobPosition}
        submitLabel="Create job position"
      />
    </div>
  );
}
