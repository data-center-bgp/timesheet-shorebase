import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EquipmentForm, type Equipment } from '../../EquipmentForm';
import { updateEquipment, deactivateEquipment, reactivateEquipment } from '../../actions';

export default async function EditEquipmentPage(props: PageProps<'/equipment/[id]/edit'>) {
  const { id } = await props.params;
  const equipmentId = Number(id);

  if (Number.isNaN(equipmentId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, code, name, active')
    .eq('id', equipmentId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load equipment: {error.message}
        </p>
      </div>
    );
  }

  if (!equipment) {
    notFound();
  }

  const { active } = equipment;
  const updateEquipmentWithId = updateEquipment.bind(null, equipmentId);
  const deactivateEquipmentWithId = deactivateEquipment.bind(null, equipmentId);
  const reactivateEquipmentWithId = reactivateEquipment.bind(null, equipmentId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit equipment
        </h2>
        <form action={active ? deactivateEquipmentWithId : reactivateEquipmentWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <EquipmentForm equipment={equipment as Equipment} action={updateEquipmentWithId} submitLabel="Save changes" />
    </div>
  );
}
