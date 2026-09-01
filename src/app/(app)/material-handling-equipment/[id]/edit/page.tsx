import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MaterialHandlingEquipmentForm, type MaterialHandlingEquipmentRecord } from '../../MaterialHandlingEquipmentForm';
import {
  updateMaterialHandlingEquipment,
  deactivateMaterialHandlingEquipment,
  reactivateMaterialHandlingEquipment,
} from '../../actions';

export default async function EditMaterialHandlingEquipmentPage(
  props: PageProps<'/material-handling-equipment/[id]/edit'>,
) {
  const { id } = await props.params;
  const recordId = Number(id);

  if (Number.isNaN(recordId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: record, error } = await supabase
    .from('material_handling_equipment')
    .select('id, job_id, equipment_id, active')
    .eq('id', recordId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling equipment: {error.message}
        </p>
      </div>
    );
  }

  if (!record) {
    notFound();
  }

  const { data: jobsData, error: jobsError } = await supabase
    .from('material_handling_job')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true });

  if (jobsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling jobs: {jobsError.message}
        </p>
      </div>
    );
  }

  let jobs = jobsData ?? [];
  if (record.job_id && !jobs.some((j) => j.id === record.job_id)) {
    const { data: currentJob } = await supabase
      .from('material_handling_job')
      .select('id, name')
      .eq('id', record.job_id)
      .maybeSingle();
    if (currentJob) jobs = [...jobs, currentJob];
  }

  const { data: equipmentData, error: equipmentError } = await supabase
    .from('equipment')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true });

  if (equipmentError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load equipment: {equipmentError.message}
        </p>
      </div>
    );
  }

  let equipmentOptions = equipmentData ?? [];
  if (record.equipment_id && !equipmentOptions.some((e) => e.id === record.equipment_id)) {
    const { data: currentEquipment } = await supabase
      .from('equipment')
      .select('id, name')
      .eq('id', record.equipment_id)
      .maybeSingle();
    if (currentEquipment) equipmentOptions = [...equipmentOptions, currentEquipment];
  }

  const { active } = record;
  const updateMaterialHandlingEquipmentWithId = updateMaterialHandlingEquipment.bind(null, recordId);
  const deactivateMaterialHandlingEquipmentWithId = deactivateMaterialHandlingEquipment.bind(null, recordId);
  const reactivateMaterialHandlingEquipmentWithId = reactivateMaterialHandlingEquipment.bind(null, recordId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit material handling equipment
        </h2>
        <form
          action={active ? deactivateMaterialHandlingEquipmentWithId : reactivateMaterialHandlingEquipmentWithId}
        >
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <MaterialHandlingEquipmentForm
        record={record as MaterialHandlingEquipmentRecord}
        jobs={jobs}
        equipmentOptions={equipmentOptions}
        action={updateMaterialHandlingEquipmentWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
