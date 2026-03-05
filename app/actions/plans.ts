'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const BARBERSHOP_ID = '11111111-1111-1111-1111-111111111111'

// 1. CRIAR UM NOVO PLANO
export async function createPlan(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const type = formData.get('type') as string // 'package' (qtd) ou 'subscription' (mensal)
  const price = parseFloat(formData.get('price') as string)
  const barber_fixed_commission = parseFloat(formData.get('barber_fixed_commission') as string)
  
  const cutsStr = formData.get('cuts_included') as string
  const cuts_included = cutsStr ? parseInt(cutsStr) : null

  try {
    const { error } = await supabase
      .from('plans')
      .insert({
        barbershop_id: BARBERSHOP_ID,
        name,
        type,
        price,
        cuts_included,
        barber_fixed_commission,
        active: true
      })

    if (error) throw error
    
    revalidatePath('/dashboard/plans')
    // Removido o return { success: true } para passar na validação do Next.js
  } catch (error) {
    console.error('Erro ao criar plano:', error)
    throw new Error('Falha ao cadastrar o plano.')
  }
}

// 2. ARQUIVAR / ATIVAR PLANO (SOFT DELETE)
// Não afeta quem já comprou!
export async function togglePlanStatus(planId: string, currentStatus: boolean) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('plans')
      .update({ active: !currentStatus })
      .eq('id', planId)

    if (error) throw error
    revalidatePath('/dashboard/plans')
  } catch (error) {
    console.error('Erro ao atualizar plano:', error)
    throw new Error('Falha ao atualizar status.')
  }
}

// ==========================================
// 3. VENDER / ATRIBUIR PLANO AO CLIENTE
// ==========================================
export async function assignPlanToClient(clientId: string, formData: FormData) {
  const supabase = await createClient()
  const planId = formData.get('plan_id') as string

  if (!planId) return;

  try {
    // 1. Busca os detalhes do plano que está sendo vendido
    const { data: plan } = await supabase
      .from('plans')
      .select('type, cuts_included, price')
      .eq('id', planId)
      .single()

    if (!plan) throw new Error('Plano não encontrado.')

    // Lógica de Vencimento (Se for mensal, vence em 30 dias. Se for pacote, não tem validade)
    let validUntil = null;
    if (plan.type === 'subscription') {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      validUntil = nextMonth.toISOString();
    }

    // 2. Insere na Carteira do Cliente
    const { error: subError } = await supabase
      .from('client_subscriptions')
      .insert({
        client_id: clientId,
        plan_id: planId,
        status: 'active',
        valid_until: validUntil,
        remaining_cuts: plan.cuts_included // Se for ilimitado, vai entrar como null (que é o certo)
      })

    if (subError) throw subError

    // 3. OPCIONAL MAS RECOMENDADO PARA O DRE: 
    // Você poderia lançar o `plan.price` como uma Receita no seu Fluxo de Caixa aqui.

    revalidatePath(`/dashboard/clients/${clientId}`)
  } catch (error) {
    console.error('Erro ao atribuir plano:', error)
    throw new Error('Falha ao adicionar o plano à carteira do cliente.')
  }
}

// ==========================================
// 4. CANCELAR / REMOVER PLANO DO CLIENTE
// ==========================================
export async function cancelClientSubscription(subscriptionId: string, clientId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('client_subscriptions')
      .update({ status: 'canceled' })
      .eq('id', subscriptionId)

    if (error) throw error

    // Atualiza a página do cliente para refletir a remoção instantaneamente
    revalidatePath(`/dashboard/clients/${clientId}`)
  } catch (error) {
    console.error('Erro ao cancelar plano do cliente:', error)
    throw new Error('Falha ao remover o plano.')
  }
}