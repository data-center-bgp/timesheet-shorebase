'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type InvoiceComponentFormState = {
  error: string | null;
};

type ReadInvoiceComponentFieldsResult =
  | { error: string }
  | {
      values: {
        invoice_id: number;
        contract_service_id: number;
        shorebase_service_id: number;
        company_id: number;
        uom_code: string;
        price_per_uom_contract: number | null;
        price_per_uom_independent: number | null;
        actual_price_per_uom: number | null;
        agg_amount: number | null;
        remark: string | null;
      };
    };

function readInvoiceComponentFields(formData: FormData): ReadInvoiceComponentFieldsResult {
  const invoiceIdRaw = formData.get('invoice_id') as string | null;
  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const shorebaseServiceIdRaw = formData.get('shorebase_service_id') as string | null;
  const companyIdRaw = formData.get('company_id') as string | null;
  const uomCode = (formData.get('uom_code') as string | null)?.trim();

  if (!invoiceIdRaw || !contractServiceIdRaw || !shorebaseServiceIdRaw || !companyIdRaw || !uomCode) {
    return { error: 'Invoice, contract service, service, company, and UoM are required.' };
  }

  const invoiceId = Number(invoiceIdRaw);
  const contractServiceId = Number(contractServiceIdRaw);
  const shorebaseServiceId = Number(shorebaseServiceIdRaw);
  const companyId = Number(companyIdRaw);
  if (
    Number.isNaN(invoiceId) ||
    Number.isNaN(contractServiceId) ||
    Number.isNaN(shorebaseServiceId) ||
    Number.isNaN(companyId)
  ) {
    return { error: 'Invalid invoice, contract service, service, or company.' };
  }

  const priceContractRaw = (formData.get('price_per_uom_contract') as string | null)?.trim();
  const priceIndependentRaw = (formData.get('price_per_uom_independent') as string | null)?.trim();
  const actualPriceRaw = (formData.get('actual_price_per_uom') as string | null)?.trim();
  const aggAmountRaw = (formData.get('agg_amount') as string | null)?.trim();
  const remarkRaw = (formData.get('remark') as string | null)?.trim();

  const priceContract = priceContractRaw ? Number(priceContractRaw) : null;
  if (priceContract !== null && (!Number.isFinite(priceContract) || priceContract < 0)) {
    return { error: 'Invalid price per UoM (contract).' };
  }

  const priceIndependent = priceIndependentRaw ? Number(priceIndependentRaw) : null;
  if (priceIndependent !== null && (!Number.isFinite(priceIndependent) || priceIndependent < 0)) {
    return { error: 'Invalid price per UoM (independent).' };
  }

  const actualPrice = actualPriceRaw ? Number(actualPriceRaw) : null;
  if (actualPrice !== null && (!Number.isFinite(actualPrice) || actualPrice < 0)) {
    return { error: 'Invalid actual price per UoM.' };
  }

  const aggAmount = aggAmountRaw ? Number(aggAmountRaw) : null;
  if (aggAmount !== null && (!Number.isInteger(aggAmount) || aggAmount < 0)) {
    return { error: 'Aggregate amount must be a non-negative whole number.' };
  }

  return {
    values: {
      invoice_id: invoiceId,
      contract_service_id: contractServiceId,
      shorebase_service_id: shorebaseServiceId,
      company_id: companyId,
      uom_code: uomCode,
      price_per_uom_contract: priceContract,
      price_per_uom_independent: priceIndependent,
      actual_price_per_uom: actualPrice,
      agg_amount: aggAmount,
      remark: remarkRaw || null,
    },
  };
}

export async function createInvoiceComponent(
  _prevState: InvoiceComponentFormState,
  formData: FormData,
): Promise<InvoiceComponentFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const parsed = readInvoiceComponentFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('invoice_component').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/invoice-components');
  redirect('/invoice-components');
}

export async function updateInvoiceComponent(
  id: number,
  _prevState: InvoiceComponentFormState,
  formData: FormData,
): Promise<InvoiceComponentFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const parsed = readInvoiceComponentFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('invoice_component').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/invoice-components');
  redirect('/invoice-components');
}
