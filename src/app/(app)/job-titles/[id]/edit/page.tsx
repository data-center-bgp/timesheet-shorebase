import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobTitleForm, type JobTitle } from '../../JobTitleForm';
import { updateJobTitle } from '../../actions';

export default async function EditJobTitlePage(props: PageProps<'/job-titles/[id]/edit'>) {
  const { id } = await props.params;
  const jobTitleId = Number(id);

  if (Number.isNaN(jobTitleId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: jobTitle, error } = await supabase
    .from('job_title')
    .select('id, code, name, start_date, end_date, active')
    .eq('id', jobTitleId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job title: {error.message}
        </p>
      </div>
    );
  }

  if (!jobTitle) {
    notFound();
  }

  const updateJobTitleWithId = updateJobTitle.bind(null, jobTitleId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit job title
      </h2>
      <JobTitleForm jobTitle={jobTitle as JobTitle} action={updateJobTitleWithId} submitLabel="Save changes" />
    </div>
  );
}
