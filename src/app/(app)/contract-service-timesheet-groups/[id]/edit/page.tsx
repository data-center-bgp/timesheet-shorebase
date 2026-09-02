import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  ContractServiceTimesheetGroupForm,
  type ContractServiceTimesheetGroup,
} from '../../ContractServiceTimesheetGroupForm';
import {
  updateContractServiceTimesheetGroup,
  deactivateContractServiceTimesheetGroup,
  reactivateContractServiceTimesheetGroup,
} from '../../actions';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function EditContractServiceTimesheetGroupPage(
  props: PageProps<'/contract-service-timesheet-groups/[id]/edit'>,
) {
  const { id } = await props.params;
  const contractServiceTimesheetGroupId = Number(id);

  if (Number.isNaN(contractServiceTimesheetGroupId)) {
    notFound();
  }

  const isManager = await isManagerRole();
  const supabase = await createClient();
  const { data: contractServiceTimesheetGroup, error } = await supabase
    .from('contract_service_timesheet_group')
    .select('id, name, active')
    .eq('id', contractServiceTimesheetGroupId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract service group: {error.message}
        </p>
      </div>
    );
  }

  if (!contractServiceTimesheetGroup) {
    notFound();
  }

  const { active } = contractServiceTimesheetGroup;
  const updateContractServiceTimesheetGroupWithId = updateContractServiceTimesheetGroup.bind(
    null,
    contractServiceTimesheetGroupId,
  );
  const deactivateContractServiceTimesheetGroupWithId = deactivateContractServiceTimesheetGroup.bind(
    null,
    contractServiceTimesheetGroupId,
  );
  const reactivateContractServiceTimesheetGroupWithId = reactivateContractServiceTimesheetGroup.bind(
    null,
    contractServiceTimesheetGroupId,
  );

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit contract service group
        </h2>
        {!isManager && (
          <form
            action={
              active
                ? deactivateContractServiceTimesheetGroupWithId
                : reactivateContractServiceTimesheetGroupWithId
            }
          >
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {active ? 'Deactivate' : 'Reactivate'}
            </button>
          </form>
        )}
      </div>
      <ContractServiceTimesheetGroupForm
        contractServiceTimesheetGroup={contractServiceTimesheetGroup as ContractServiceTimesheetGroup}
        action={updateContractServiceTimesheetGroupWithId}
        submitLabel="Save changes"
        readOnly={isManager}
      />
    </div>
  );
}
