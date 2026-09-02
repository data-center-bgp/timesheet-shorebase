import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobTitleForm, type JobTitle } from '../../JobTitleForm';
import { updateJobTitle, deactivateJobTitle, reactivateJobTitle } from '../../actions';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function EditJobTitlePage(props: PageProps<'/job-titles/[id]/edit'>) {
  const isManager = await isManagerRole();
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

  const { active } = jobTitle;
  const updateJobTitleWithId = updateJobTitle.bind(null, jobTitleId);
  const deactivateJobTitleWithId = deactivateJobTitle.bind(null, jobTitleId);
  const reactivateJobTitleWithId = reactivateJobTitle.bind(null, jobTitleId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit job title
        </h2>
        {!isManager && (
          <form action={active ? deactivateJobTitleWithId : reactivateJobTitleWithId}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {active ? 'Deactivate' : 'Reactivate'}
            </button>
          </form>
        )}
      </div>
      <JobTitleForm
        jobTitle={jobTitle as JobTitle}
        action={updateJobTitleWithId}
        submitLabel="Save changes"
        readOnly={isManager}
      />
    </div>
  );
}
