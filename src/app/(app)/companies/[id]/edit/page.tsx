import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CompanyForm, type Company } from '../../CompanyForm';
import { updateCompany } from '../../actions';

export default async function EditCompanyPage(props: PageProps<'/companies/[id]/edit'>) {
  const { id } = await props.params;
  const companyId = Number(id);

  if (Number.isNaN(companyId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from('company')
    .select('id, name, internal, start_date, end_date')
    .eq('id', companyId)
    .maybeSingle();

  if (!company) {
    notFound();
  }

  const updateCompanyWithId = updateCompany.bind(null, companyId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit company
      </h2>
      <CompanyForm
        company={company as Company}
        action={updateCompanyWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
