'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type UserFormState = {
  error: string | null;
};

export async function updateUser(
  id: string,
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const username = (formData.get('username') as string | null)?.trim() || null;

  const roleCode = (formData.get('role_code') as string | null)?.trim();
  if (!roleCode) {
    return { error: 'Role is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('app_user')
    .update({ name, username, role_code: roleCode })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/users');
  redirect('/users');
}
