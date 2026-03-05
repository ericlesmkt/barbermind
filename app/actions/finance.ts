'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const barbershopId = '11111111-1111-1111-1111-111111111111'

// ==========================================
// MÓDULO 1: DESPESAS DO SALÃO (ÁGUA, LUZ, ETC)
// ==========================================

// 1. Adicionar Nova Despesa
export async function addExpense(formData: FormData) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const amount = parseFloat(formData.get('amount') as string) || 0
  const category = formData.get('category') as string
  const due_date = formData.get('due_date') as string

  try {
    const { error } = await supabase
      .from('expenses')
      .insert({
        barbershop_id: barbershopId,
        title,
        amount,
        category,
        due_date,
        is_paid: false
      })

    if (error) throw error

    revalidatePath('/dashboard/finance')
    return { success: true }
  } catch (error) {
    console.error('Erro ao adicionar despesa:', error)
    throw new Error('Falha ao registar a despesa no banco de dados.')
  }
}

// 2. Alternar Status de Pagamento (Pagar / Desfazer)
export async function toggleExpensePayment(expenseId: string, isPaid: boolean) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('expenses')
      .update({ is_paid: isPaid })
      .eq('id', expenseId)

    if (error) throw error

    revalidatePath('/dashboard/finance')
  } catch (error) {
    console.error('Erro ao atualizar pagamento:', error)
    throw new Error('Falha ao atualizar o status da conta.')
  }
}

// 3. Eliminar Despesa
export async function deleteExpense(expenseId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) throw error

    revalidatePath('/dashboard/finance')
  } catch (error) {
    console.error('Erro ao eliminar despesa:', error)
    throw new Error('Falha ao eliminar o registo.')
  }
}

// ==========================================
// MÓDULO 2: ACERTO DE BARBEIROS (COMISSÕES E VALES)
// ==========================================

// 4. Calcular Extrato do Barbeiro (Valores Pendentes)
export async function getBarberStatement(professionalId: string) {
  const supabase = await createClient()

  // Busca cortes finalizados cuja comissão ainda não foi paga
  // Traz a taxa fixa do plano (se o corte foi feito usando plano)
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id, service_name, price, used_subscription_id, scheduled_at,
      client_subscriptions (
        plans ( barber_fixed_commission )
      )
    `)
    .eq('professional_id', professionalId)
    .eq('status', 'completed')
    .eq('commission_status', 'pending')

  // Busca os vales/adiantamentos pendentes deste barbeiro
  const { data: advances } = await supabase
    .from('barber_advances')
    .select('id, amount, description, created_at')
    .eq('professional_id', professionalId)
    .eq('status', 'pending')

  let totalAvulso = 0;
  let totalPlanos = 0;
  let cortesAvulsosCount = 0;
  let cortesPlanosCount = 0;

  // Assume 50% de comissão para cortes normais avulsos
  const COMISSAO_PADRAO = 0.5; 

  appointments?.forEach((apt: any) => {
    // Se tem ID de assinatura E conseguiu buscar o plano vinculado
    if (apt.used_subscription_id && apt.client_subscriptions?.plans) {
      totalPlanos += Number(apt.client_subscriptions.plans.barber_fixed_commission);
      cortesPlanosCount++;
    } else {
      totalAvulso += Number(apt.price) * COMISSAO_PADRAO;
      cortesAvulsosCount++;
    }
  });

  const totalVales = advances?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
  
  // (Comissões Normais + Comissões de Planos) - Vales
  const valorLiquidoReceber = (totalAvulso + totalPlanos) - totalVales;

  return {
    cortesAvulsosCount,
    cortesPlanosCount,
    totalAvulso,
    totalPlanos,
    totalComissoes: totalAvulso + totalPlanos,
    vales: advances || [],
    totalVales,
    valorLiquidoReceber
  };
}

// 5. Lançar um Vale / Adiantamento
export async function addBarberAdvance(formData: FormData) {
  const supabase = await createClient()

  const professionalId = formData.get('professional_id') as string
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string

  if (!professionalId || !amount) throw new Error('Dados inválidos.')

  try {
    const { error } = await supabase
      .from('barber_advances')
      .insert({
        barbershop_id: barbershopId,
        professional_id: professionalId,
        amount,
        description,
        status: 'pending'
      })

    if (error) throw error
    revalidatePath('/dashboard/finance')
    return { success: true }
  } catch (error) {
    console.error('Erro ao lançar vale:', error)
    throw new Error('Falha ao registrar adiantamento.')
  }
}

// 6. Fechar Acerto (Zerar conta e marcar como Pago)
export async function settleBarberAccount(professionalId: string) {
  const supabase = await createClient()

  try {
    // Marca todos os cortes pendentes como PAGOS
    const { error: aptError } = await supabase
      .from('appointments')
      .update({ commission_status: 'settled' })
      .eq('professional_id', professionalId)
      .eq('status', 'completed')
      .eq('commission_status', 'pending')

    if (aptError) throw aptError

    // Marca todos os vales pendentes como DESCONTADOS
    const { error: advError } = await supabase
      .from('barber_advances')
      .update({ status: 'settled' })
      .eq('professional_id', professionalId)
      .eq('status', 'pending')

    if (advError) throw advError

    revalidatePath('/dashboard/finance')
    return { success: true }
  } catch (error) {
    console.error('Erro ao fechar acerto:', error)
    throw new Error('Falha ao processar o pagamento.')
  }
}