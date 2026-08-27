import { JobTitleForm } from '../JobTitleForm';
import { createJobTitle } from '../actions';

export default function NewJobTitlePage() {
  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add job title
      </h2>
      <JobTitleForm action={createJobTitle} submitLabel="Create job title" />
    </div>
  );
}
