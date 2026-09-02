'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type InvoiceFormState = {
  error: string | null;
};

type ReadInvoiceFieldsResult =
  | { error: string }
  | {
      values: {
        proforma_invoice_id: number;
        period_id: number;
        code: string;
        issue_date: string | null;
        tax_percentage: number | null;
      };
    };

function readInvoiceFields(formData: FormData): ReadInvoiceFieldsResult {
  const proformaInvoiceIdRaw = formData.get('proforma_invoice_id') as string | null;
  const proformaInvoiceId = proformaInvoiceIdRaw ? Number(proformaInvoiceIdRaw) : NaN;
  if (!proformaInvoiceIdRaw || Number.isNaN(proformaInvoiceId)) {
    return { error: 'Proforma invoice is required.' };
  }

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
      proforma_invoice_id: proformaInvoiceId,
      period_id: periodId,
      code,
      issue_date: issueDate || null,
      tax_percentage: taxPercentage,
    },
  };
}

export async function createInvoice(
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const parsed = readInvoiceFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('invoice').insert({
    ...parsed.values,
    type_code: 'I',
    status_code: 'D',
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/invoices');
  redirect('/invoices');
}

export async function updateInvoice(
  id: number,
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
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
    return { error: 'This invoice has been finalized and can no longer be edited.' };
  }

  const parsed = readInvoiceFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const { error } = await supabase.from('invoice').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/invoices');
  redirect('/invoices');
}

export async function finalizeInvoice(id: number) {
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
    throw new Error('This invoice has already been finalized.');
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
    throw new Error('Invoice not found.');
  }

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}/edit`);
}
