import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CompanyForm, type Company } from '../../CompanyForm';
import { updateCompany, deactivateCompany, reactivateCompany } from '../../actions';

export default async function EditCompanyPage(props: PageProps<'/companies/[id]/edit'>) {
  const { id } = await props.params;
  const companyId = Number(id);

  if (Number.isNaN(companyId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: company, error } = await supabase
    .from('company')
    .select('id, name, internal, start_date, end_date, active')
    .eq('id', companyId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load company: {error.message}
        </p>
      </div>
    );
  }

  if (!company) {
    notFound();
  }

  const { active } = company;
  const updateCompanyWithId = updateCompany.bind(null, companyId);
  const deactivateCompanyWithId = deactivateCompany.bind(null, companyId);
  const reactivateCompanyWithId = reactivateCompany.bind(null, companyId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit company
        </h2>
        <form action={active ? deactivateCompanyWithId : reactivateCompanyWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <CompanyForm
        company={company as Company}
        action={updateCompanyWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
