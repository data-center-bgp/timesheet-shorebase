import { EquipmentForm } from '../EquipmentForm';
import { createEquipment } from '../actions';

export default function NewEquipmentPage() {
  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add equipment
      </h2>
      <EquipmentForm action={createEquipment} submitLabel="Create equipment" />
    </div>
  );
}
