import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JettyShipForm, type JettyShip } from '../../JettyShipForm';
import { updateJettyShip, deactivateJettyShip, reactivateJettyShip } from '../../actions';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function EditJettyShipPage(props: PageProps<'/jetty-ships/[id]/edit'>) {
  const { id } = await props.params;
  const jettyShipId = Number(id);

  if (Number.isNaN(jettyShipId)) {
    notFound();
  }

  const isManager = await isManagerRole();
  const supabase = await createClient();
  const { data: jettyShip, error } = await supabase
    .from('jetty_ship')
    .select('id, type, name, active')
    .eq('id', jettyShipId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load jetty/ship: {error.message}
        </p>
      </div>
    );
  }

  if (!jettyShip) {
    notFound();
  }

  const { active } = jettyShip;
  const updateJettyShipWithId = updateJettyShip.bind(null, jettyShipId);
  const deactivateJettyShipWithId = deactivateJettyShip.bind(null, jettyShipId);
  const reactivateJettyShipWithId = reactivateJettyShip.bind(null, jettyShipId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit jetty/ship
        </h2>
        {!isManager && (
          <form action={active ? deactivateJettyShipWithId : reactivateJettyShipWithId}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {active ? 'Deactivate' : 'Reactivate'}
            </button>
          </form>
        )}
      </div>
      <JettyShipForm
        jettyShip={jettyShip as JettyShip}
        action={updateJettyShipWithId}
        submitLabel="Save changes"
        readOnly={isManager}
      />
    </div>
  );
}
