'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type PersonAccomodationFormState = {
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

export async function createPersonAccomodation(
  _prevState: PersonAccomodationFormState,
  formData: FormData,
): Promise<PersonAccomodationFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

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

  const roomTypeCode = (formData.get('room_type_code') as string | null)?.trim();
  if (!roomTypeCode) {
    return { error: 'Room type is required.' };
  }

  const countRaw = (formData.get('count') as string | null)?.trim();
  const count = countRaw ? Number(countRaw) : NaN;
  if (!countRaw || !Number.isInteger(count) || count < 1) {
    return { error: 'Count is required and must be a positive whole number.' };
  }

  const startDate = (formData.get('start_date') as string | null)?.trim();
  if (!startDate) {
    return { error: 'Start date is required.' };
  }

  const endDate = (formData.get('end_date') as string | null)?.trim();
  if (!endDate) {
    return { error: 'End date is required.' };
  }

  const supabase = await createClient();
  const { companyId, staffTypeCode } = await lookupCompanyAndStaffTypeForPerson(supabase, personId);

  const { error } = await supabase.from('person_accomodation').insert({
    person_id: personId,
    contract_service_id: contractServiceId,
    room_type_code: roomTypeCode,
    company_id: companyId,
    staff_type_code: staffTypeCode,
    count,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/accommodation');
  redirect('/accommodation');
}

export async function updatePersonAccomodation(
  id: number,
  _prevState: PersonAccomodationFormState,
  formData: FormData,
): Promise<PersonAccomodationFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

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

  const roomTypeCode = (formData.get('room_type_code') as string | null)?.trim();
  if (!roomTypeCode) {
    return { error: 'Room type is required.' };
  }

  const countRaw = (formData.get('count') as string | null)?.trim();
  const count = countRaw ? Number(countRaw) : NaN;
  if (!countRaw || !Number.isInteger(count) || count < 1) {
    return { error: 'Count is required and must be a positive whole number.' };
  }

  const startDate = (formData.get('start_date') as string | null)?.trim();
  if (!startDate) {
    return { error: 'Start date is required.' };
  }

  const endDate = (formData.get('end_date') as string | null)?.trim();
  if (!endDate) {
    return { error: 'End date is required.' };
  }

  const supabase = await createClient();
  const { companyId, staffTypeCode } = await lookupCompanyAndStaffTypeForPerson(supabase, personId);

  const { error } = await supabase
    .from('person_accomodation')
    .update({
      person_id: personId,
      contract_service_id: contractServiceId,
      room_type_code: roomTypeCode,
      company_id: companyId,
      staff_type_code: staffTypeCode,
      count,
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/accommodation');
  redirect('/accommodation');
}

export async function deactivatePersonAccomodation(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person_accomodation')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Accommodation record not found.');
  }

  revalidatePath('/accommodation');
  revalidatePath(`/accommodation/${id}/edit`);
}

export async function reactivatePersonAccomodation(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person_accomodation')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Accommodation record not found.');
  }

  revalidatePath('/accommodation');
  revalidatePath(`/accommodation/${id}/edit`);
}
