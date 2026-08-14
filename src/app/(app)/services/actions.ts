'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ServiceFormState = {
  error: string | null;
};

export async function createService(
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const serviceTypeCode = (formData.get('service_type_code') as string | null)?.trim();
  if (!serviceTypeCode) {
    return { error: 'Service type is required.' };
  }

  const defaultUomCode = (formData.get('default_uom_code') as string | null)?.trim();
  if (!defaultUomCode) {
    return { error: 'UoM is required.' };
  }

  const priceRaw = (formData.get('default_price_per_uom') as string | null)?.trim();
  const defaultPricePerUom = priceRaw ? Number(priceRaw) : NaN;
  if (!priceRaw || Number.isNaN(defaultPricePerUom) || defaultPricePerUom < 0) {
    return { error: 'Default price per UoM is required and must be a non-negative number.' };
  }

  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;
  const description = (formData.get('description') as string | null)?.trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from('shorebase_service').insert({
    code,
    name,
    service_type_code: serviceTypeCode,
    default_uom_code: defaultUomCode,
    default_price_per_uom: defaultPricePerUom,
    start_date: startDate,
    end_date: endDate,
    description,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/services');
  redirect('/services');
}

export async function updateService(
  id: number,
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const serviceTypeCode = (formData.get('service_type_code') as string | null)?.trim();
  if (!serviceTypeCode) {
    return { error: 'Service type is required.' };
  }

  const defaultUomCode = (formData.get('default_uom_code') as string | null)?.trim();
  if (!defaultUomCode) {
    return { error: 'UoM is required.' };
  }

  const priceRaw = (formData.get('default_price_per_uom') as string | null)?.trim();
  const defaultPricePerUom = priceRaw ? Number(priceRaw) : NaN;
  if (!priceRaw || Number.isNaN(defaultPricePerUom) || defaultPricePerUom < 0) {
    return { error: 'Default price per UoM is required and must be a non-negative number.' };
  }

  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;
  const description = (formData.get('description') as string | null)?.trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from('shorebase_service')
    .update({
      code,
      name,
      service_type_code: serviceTypeCode,
      default_uom_code: defaultUomCode,
      default_price_per_uom: defaultPricePerUom,
      start_date: startDate,
      end_date: endDate,
      description,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/services');
  redirect('/services');
}
