'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfessionalSchedule(professionalId: string, schedule: any) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('professionals')
    .update({ schedule })
    .eq('id', professionalId)

  if (error) {
    console.error('Erro ao salvar expediente:', error.message)
    throw new Error('Falha ao gravar horários no banco de dados.')
  }

  // Avisa o Next.js para atualizar em tempo real a tela do barbeiro, a recepção e a agenda
  revalidatePath('/barber')
  revalidatePath('/dashboard/new')
  revalidatePath('/dashboard/agenda')
  
  return { success: true }
}