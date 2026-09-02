import { redirect } from 'next/navigation';
import { JettyShipForm } from '../JettyShipForm';
import { createJettyShip } from '../actions';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function NewJettyShipPage() {
  if (await isManagerRole()) {
    redirect('/jetty-ships');
  }

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add jetty/ship
      </h2>
      <JettyShipForm action={createJettyShip} submitLabel="Create jetty/ship" />
    </div>
  );
}
