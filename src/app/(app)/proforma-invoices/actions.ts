'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type ProformaInvoiceFormState = {
  error: string | null;
};

type ReadProformaInvoiceFieldsResult =
  | { error: string }
  | {
      values: {
        period_id: number;
        code: string;
        issue_date: string | null;
        tax_percentage: number | null;
      };
    };

function readProformaInvoiceFields(formData: FormData): ReadProformaInvoiceFieldsResult {
  const periodIdRaw = formData.get('period_id') as string | null;
  const periodId = periodIdRaw ? Number(periodIdRaw) : NaN;
  if (!periodIdRaw || Number.isNaN(periodId)) {
    return { error: 'Period is required.' };
  }

  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const issueDate = (formData.get('issue_date') as string | null)?.trim();

  const taxPercentageRaw = (formData.get('tax_percentage') as string | null)?.trim();
  let taxPercentage: number | null = null;
  if (taxPercentageRaw) {
    taxPercentage = Number(taxPercentageRaw);
    if (Number.isNaN(taxPercentage) || taxPercentage < 0) {
      return { error: 'Tax percentage must be zero or greater.' };
    }
  }

  return {
    values: {
      period_id: periodId,
      code,
      issue_date: issueDate || null,
      tax_percentage: taxPercentage,
    },
  };
}

export async function createProformaInvoice(
  _prevState: ProformaInvoiceFormState,
  formData: FormData,
): Promise<ProformaInvoiceFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const parsed = readProformaInvoiceFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('invoice').insert({
    ...parsed.values,
    type_code: 'P',
    status_code: 'D',
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/proforma-invoices');
  redirect('/proforma-invoices');
}

export async function updateProformaInvoice(
  id: number,
  _prevState: ProformaInvoiceFormState,
  formData: FormData,
): Promise<ProformaInvoiceFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const supabase = await createClient();

  const { data: current, error: currentError } = await supabase
    .from('invoice')
    .select('status_code')
    .eq('id', id)
    .maybeSingle();

  if (currentError) {
    return { error: currentError.message };
  }

  if (current?.status_code === 'F') {
    return { error: 'This proforma invoice has been finalized and can no longer be edited.' };
  }

  const parsed = readProformaInvoiceFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const { error } = await supabase.from('invoice').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/proforma-invoices');
  redirect('/proforma-invoices');
}

export async function finalizeProformaInvoice(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();

  const { data: current, error: currentError } = await supabase
    .from('invoice')
    .select('status_code')
    .eq('id', id)
    .maybeSingle();

  if (currentError) {
    throw new Error(currentError.message);
  }

  if (current?.status_code === 'F') {
    throw new Error('This proforma invoice has already been finalized.');
  }

  const { data, error } = await supabase
    .from('invoice')
    .update({ status_code: 'F', status_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Proforma invoice not found.');
  }

  revalidatePath('/proforma-invoices');
  revalidatePath(`/proforma-invoices/${id}/edit`);
}
