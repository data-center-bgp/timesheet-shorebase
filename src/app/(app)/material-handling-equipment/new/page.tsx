import { MaterialHandlingEquipmentForm } from '../MaterialHandlingEquipmentForm';
import { createMaterialHandlingEquipment } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewMaterialHandlingEquipmentPage() {
  const supabase = await createClient();

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

  const { data: equipmentData, error: equipmentError } = await supabase
    .from('equipment')
    .select('id, code, name')
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

  const jobs = jobsData ?? [];
  const equipmentOptions = equipmentData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add material handling equipment usage
      </h2>
      <MaterialHandlingEquipmentForm
        jobs={jobs}
        equipmentOptions={equipmentOptions}
        action={createMaterialHandlingEquipment}
        submitLabel="Create equipment usage"
      />
    </div>
  );
}
