'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PersonMealFormState = {
  error: string | null;
};

async function lookupCompanyAndStaffTypeForPerson(
  supabase: Awaited<ReturnType<typeof createClient>>,
  personId: number,
): Promise<{ companyId: number | null; staffTypeCode: string | null }> {
  const { data } = await supabase
    .from('person')
    .select('company_id, staff_type_code')
    .eq('id', personId)
    .maybeSingle();
  return {
    companyId: data?.company_id ?? null,
    staffTypeCode: data?.staff_type_code ?? null,
  };
}

export async function createPersonMeal(
  _prevState: PersonMealFormState,
  formData: FormData,
): Promise<PersonMealFormState> {
  const personIdRaw = formData.get('person_id') as string | null;
  const personId = personIdRaw ? Number(personIdRaw) : NaN;
  if (!personIdRaw || Number.isNaN(personId)) {
    return { error: 'Person is required.' };
  }

  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const contractServiceId = contractServiceIdRaw ? Number(contractServiceIdRaw) : NaN;
  if (!contractServiceIdRaw || Number.isNaN(contractServiceId)) {
    return { error: 'Contract service is required.' };
  }

  const mealTimeCode = (formData.get('meal_time_code') as string | null)?.trim();
  if (!mealTimeCode) {
    return { error: 'Meal time is required.' };
  }

  const countRaw = (formData.get('count') as string | null)?.trim();
  const count = countRaw ? Number(countRaw) : NaN;
  if (!countRaw || !Number.isInteger(count) || count < 1) {
    return { error: 'Count is required and must be a positive whole number.' };
  }

  const mealDate = (formData.get('meal_date') as string | null)?.trim();
  if (!mealDate) {
    return { error: 'Meal date is required.' };
  }

  const supabase = await createClient();
  const { companyId, staffTypeCode } = await lookupCompanyAndStaffTypeForPerson(supabase, personId);

  const { error } = await supabase.from('person_meal').insert({
    person_id: personId,
    contract_service_id: contractServiceId,
    meal_time_code: mealTimeCode,
    company_id: companyId,
    staff_type_code: staffTypeCode,
    count,
    meal_date: mealDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/meals');
  redirect('/meals');
}

export async function updatePersonMeal(
  id: number,
  _prevState: PersonMealFormState,
  formData: FormData,
): Promise<PersonMealFormState> {
  const personIdRaw = formData.get('person_id') as string | null;
  const personId = personIdRaw ? Number(personIdRaw) : NaN;
  if (!personIdRaw || Number.isNaN(personId)) {
    return { error: 'Person is required.' };
  }

  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const contractServiceId = contractServiceIdRaw ? Number(contractServiceIdRaw) : NaN;
  if (!contractServiceIdRaw || Number.isNaN(contractServiceId)) {
    return { error: 'Contract service is required.' };
  }

  const mealTimeCode = (formData.get('meal_time_code') as string | null)?.trim();
  if (!mealTimeCode) {
    return { error: 'Meal time is required.' };
  }

  const countRaw = (formData.get('count') as string | null)?.trim();
  const count = countRaw ? Number(countRaw) : NaN;
  if (!countRaw || !Number.isInteger(count) || count < 1) {
    return { error: 'Count is required and must be a positive whole number.' };
  }

  const mealDate = (formData.get('meal_date') as string | null)?.trim();
  if (!mealDate) {
    return { error: 'Meal date is required.' };
  }

  const supabase = await createClient();
  const { companyId, staffTypeCode } = await lookupCompanyAndStaffTypeForPerson(supabase, personId);

  const { error } = await supabase
    .from('person_meal')
    .update({
      person_id: personId,
      contract_service_id: contractServiceId,
      meal_time_code: mealTimeCode,
      company_id: companyId,
      staff_type_code: staffTypeCode,
      count,
      meal_date: mealDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/meals');
  redirect('/meals');
}
