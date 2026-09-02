'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type JettyShipFormState = {
  error: string | null;
};

export async function createJettyShip(
  _prevState: JettyShipFormState,
  formData: FormData,
): Promise<JettyShipFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const type = (formData.get('type') as string | null)?.trim();
  if (!type) {
    return { error: 'Type is required.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('jetty_ship').insert({ type, name });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/jetty-ships');
  redirect('/jetty-ships');
}

export async function updateJettyShip(
  id: number,
  _prevState: JettyShipFormState,
  formData: FormData,
): Promise<JettyShipFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const type = (formData.get('type') as string | null)?.trim();
  if (!type) {
    return { error: 'Type is required.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('jetty_ship').update({ type, name }).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/jetty-ships');
  redirect('/jetty-ships');
}

export async function deactivateJettyShip(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jetty_ship')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Jetty/ship not found.');
  }

  revalidatePath('/jetty-ships');
  revalidatePath(`/jetty-ships/${id}/edit`);
}

export async function reactivateJettyShip(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jetty_ship')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Jetty/ship not found.');
  }

  revalidatePath('/jetty-ships');
  revalidatePath(`/jetty-ships/${id}/edit`);
}
