'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireMasterRole } from '@/lib/auth/require-master';

export type UserFormState = {
  error: string | null;
};

export async function createUser(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireMasterRole();

  const email = (formData.get('email') as string | null)?.trim();
  if (!email) {
    return { error: 'Email is required.' };
  }

  const password = (formData.get('password') as string | null) ?? '';
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const username = (formData.get('username') as string | null)?.trim() || null;

  const roleCode = (formData.get('role_code') as string | null)?.trim();
  if (!roleCode) {
    return { error: 'Role is required.' };
  }

  const adminClient = createAdminClient();
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? 'Could not create the account.' };
  }

  const { error: updateError } = await adminClient
    .from('app_user')
    .update({ username, role_code: roleCode })
    .eq('id', created.user.id);

  if (updateError) {
    // The Auth account already exists at this point - don't leave a stray,
    // misconfigured (default-role) login behind if we can't finish setting
    // it up the way the admin asked.
    await adminClient.auth.admin.deleteUser(created.user.id);
    return { error: updateError.message };
  }

  revalidatePath('/users');
  redirect('/users');
}

export async function updateUser(
  id: string,
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const currentUser = await requireMasterRole();

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const username = (formData.get('username') as string | null)?.trim() || null;

  const roleCode = (formData.get('role_code') as string | null)?.trim();
  if (!roleCode) {
    return { error: 'Role is required.' };
  }

  if (id === currentUser.id && roleCode !== 'master') {
    return { error: 'You cannot remove your own master role.' };
  }

  const newPassword = (formData.get('new_password') as string | null) ?? '';
  if (newPassword && newPassword.length < 8) {
    return { error: 'New password must be at least 8 characters.' };
  }

  const adminClient = createAdminClient();

  if (newPassword) {
    const { error: passwordError } = await adminClient.auth.admin.updateUserById(id, {
      password: newPassword,
    });
    if (passwordError) {
      return { error: passwordError.message };
    }
  }

  const { error } = await adminClient
    .from('app_user')
    .update({ name, username, role_code: roleCode })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/users');
  redirect('/users');
}

export async function deactivateUser(id: string) {
  const currentUser = await requireMasterRole();

  if (id === currentUser.id) {
    throw new Error('You cannot deactivate your own account.');
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(id, { ban_duration: '87600h' });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/users');
  revalidatePath(`/users/${id}/edit`);
}

export async function reactivateUser(id: string) {
  await requireMasterRole();

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(id, { ban_duration: 'none' });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/users');
  revalidatePath(`/users/${id}/edit`);
}
