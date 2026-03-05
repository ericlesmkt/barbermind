'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { recalculateClientCycle, checkWaitlistForCanceledSlot } from './intelligence'

const barbershopId = '11111111-1111-1111-1111-111111111111'

// ==========================================
// 1. CRIAR NOVO AGENDAMENTO (COM SHOP E LOG)
// ==========================================
export async function createAppointment(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const serviceId = formData.get('service') as string
  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const professionalId = formData.get('professional') as string
  
  const productsJson = formData.get('products') as string
  const productIds: string[] = productsJson ? JSON.parse(productsJson) : []

  if (!name || !phone || !date || !time) {
    throw new Error('Preencha todos os campos obrigatórios.')
  }

  const cleanedPhone = phone.replace(/\D/g, '');
  const scheduledAt = new Date(`${date}T${time}:00-03:00`).toISOString()
  
  const services: Record<string, { name: string, price: number }> = {
    'corte': { name: 'Corte Social', price: 70.00 },
    'fade': { name: 'Degradê / Fade', price: 80.00 },
    'barba': { name: 'Barboterapia', price: 50.00 },
    'combo': { name: 'Combo (C+B)', price: 110.00 },
  }
  const serviceData = services[serviceId] || services['corte']

  try {
    let { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('whatsapp', cleanedPhone)
      .maybeSingle()

    let clientId = client?.id

    if (!clientId) {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          barbershop_id: barbershopId,
          name: name,
          whatsapp: cleanedPhone,
          preferences: {} 
        })
        .select()
        .single()

      if (clientError) throw clientError
      clientId = newClient.id
    }

    const { error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        client_id: clientId,
        barbershop_id: barbershopId,
        professional_id: professionalId,
        service_name: serviceData.name,
        price: serviceData.price,
        scheduled_at: scheduledAt,
        status: 'confirmed'
      })

    if (appointmentError) throw appointmentError

    // ==========================================
    // MÓDULO: SHOP E BAIXA DE ESTOQUE
    // ==========================================
    if (productIds.length > 0) {
      const { data: dbProducts, error: prodError } = await supabase
        .from('products')
        .select('id, price, stock_quantity')
        .in('id', productIds)

      if (prodError) throw prodError

      if (dbProducts && dbProducts.length > 0) {
        const totalOrderPrice = dbProducts.reduce((acc, curr) => acc + Number(curr.price), 0)

        const { data: newOrder, error: orderError } = await supabase
          .from('shop_orders')
          .insert({
            client_id: clientId,
            barbershop_id: barbershopId,
            total_price: totalOrderPrice,
            status: 'pending_pickup'
          })
          .select('id')
          .single()

        if (orderError) throw orderError

        const orderItems = dbProducts.map(p => ({
          order_id: newOrder.id,
          product_id: p.id,
          quantity: 1,
          price_at_purchase: p.price
        }))

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
        if (itemsError) throw itemsError

        for (const p of dbProducts) {
          await supabase
            .from('products')
            .update({ stock_quantity: Math.max(0, p.stock_quantity - 1) })
            .eq('id', p.id)
        }
      }
    }

    // ==========================================
    // LOG DE SISTEMA: NOVO AGENDAMENTO (RECEÇÃO)
    // ==========================================
    const { data: prof } = await supabase.from('professionals').select('name').eq('id', professionalId).maybeSingle();
    const profName = prof?.name || 'um barbeiro';
    const dateFormatted = date.split('-').reverse().join('/');

    await supabase.from('system_logs').insert({
      barbershop_id: barbershopId,
      type: 'info',
      title: 'Novo Encaixe (Painel)',
      message: `${name} foi agendado para ${serviceData.name} com ${profName} dia ${dateFormatted} às ${time}.`
    });

  } catch (error) {
    console.error('Erro ao salvar:', error)
    throw new Error('Falha ao gravar no banco de dados.')
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/products')
  redirect('/dashboard')
}

// ==========================================
// 2. ATUALIZAR STATUS DO AGENDAMENTO
// ==========================================
export async function updateAppointmentStatus(
  appointmentId: string, 
  newStatus: 'completed' | 'confirmed' | 'no_show' | 'canceled'
) {
  const supabase = await createClient()

  try {
    // 1. Busca os dados ANTES de mudar o status
    const { data: apt } = await supabase
      .from('appointments')
      .select('client_id, status, scheduled_at, professional_id, service_name')
      .eq('id', appointmentId)
      .single()

    // 2. Atualiza o status
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)

    if (error) throw error

    if (apt && (newStatus === 'canceled' || newStatus === 'no_show')) {
      // ==========================================
      // SISTEMA DE ESTORNO DE ESTOQUE (ANTI-RALO)
      // ==========================================
      const { data: pendingOrders } = await supabase
        .from('shop_orders')
        .select('id')
        .eq('client_id', apt.client_id)
        .eq('status', 'pending_pickup')

      if (pendingOrders && pendingOrders.length > 0) {
        for (const order of pendingOrders) {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .eq('order_id', order.id)

          if (orderItems) {
            for (const item of orderItems) {
              const { data: product } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', item.product_id)
                .single()

              if (product) {
                await supabase
                  .from('products')
                  .update({ stock_quantity: product.stock_quantity + item.quantity })
                  .eq('id', item.product_id)
              }
            }
          }

          await supabase
            .from('shop_orders')
            .update({ status: 'canceled' })
            .eq('id', order.id)
        }
      }
      
      // ==========================================
      // INTELIGÊNCIA: CAÇADOR DE VAGAS (WAITLIST)
      // ==========================================
      if (newStatus === 'canceled' && apt.scheduled_at) {
        const dateStr = apt.scheduled_at.split('T')[0];
        const waitlist = await checkWaitlistForCanceledSlot(dateStr, apt.professional_id);
        
        if (waitlist && waitlist.length > 0) {
          console.log(`[WAITLIST TRIGGER] ${waitlist.length} clientes na fila para cobrir a vaga do dia ${dateStr}!`);
        }
      }

      // ==========================================
      // LOG DE SISTEMA: CANCELAMENTO BLINDADO
      // ==========================================
      const { data: cData } = await supabase.from('clients').select('name').eq('id', apt.client_id).maybeSingle();
      const { data: pData } = await supabase.from('professionals').select('name').eq('id', apt.professional_id).maybeSingle();
      
      const clientName = cData?.name || 'Um cliente';
      const profName = pData?.name || 'um barbeiro';

      await supabase.from('system_logs').insert({
        barbershop_id: barbershopId,
        type: 'alert',
        title: 'Cancelamento Detectado',
        message: `O cliente ${clientName} cancelou o ${apt.service_name} com ${profName}. A cadeira ficou vaga.`
      })
    }

  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    throw new Error('Falha ao atualizar o status no banco de dados.')
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard/products')
}

// ==========================================
// 3. ATUALIZAR PERFIL DO CLIENTE
// ==========================================
export async function updateClientProfile(clientId: string, formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const rawWhatsapp = formData.get('whatsapp') as string
  const rawSecondary = formData.get('secondary_phone') as string
  const email = formData.get('email') as string
  const address = formData.get('address') as string
  const birth_date = formData.get('birth_date') as string
  
  const whatsapp = rawWhatsapp ? rawWhatsapp.replace(/\D/g, '') : ''
  const secondary_phone = rawSecondary ? rawSecondary.replace(/\D/g, '') : ''
  const safeBirthDate = birth_date && birth_date.trim() !== "" ? birth_date : null;

  const preferences = {
    usa_pomada: formData.get('usa_pomada') === 'on',
    tipo_pele: formData.get('tipo_pele') as string,
    falhas_barba: formData.get('falhas_barba') === 'on',
  }

  const { error } = await supabase
    .from('clients')
    .update({ 
      name, 
      whatsapp, 
      secondary_phone,
      email,
      address,
      birth_date: safeBirthDate,
      preferences 
    })
    .eq('id', clientId)

  if (error) {
    console.error('ERRO:', error.message, error.details)
    throw new Error(`Erro no banco: ${error.message}`) 
  }

  revalidatePath(`/dashboard/clients/${clientId}`)
  revalidatePath('/dashboard')
}

// ==========================================
// 4. CHECKOUT (Receber e Finalizar Corte + Produtos + Pós-Venda n8n)
// ==========================================
export async function checkoutAppointment(appointmentId: string, clientId?: string) {
  const supabase = await createClient()

  try {
    // Busca os dados básicos ANTES de finalizar
    const { data: aptData } = await supabase
      .from('appointments')
      .select('service_name, client_id, professional_id')
      .eq('id', appointmentId)
      .single()

    // 1. Marca o corte como finalizado e injeta a pendência de comissão (Seu código DRE)
    const { error: aptError } = await supabase
      .from('appointments')
      .update({ status: 'completed', commission_status: 'pending' })
      .eq('id', appointmentId)

    if (aptError) throw aptError

    // ==========================================
    // LOG DE SISTEMA E GATILHO N8N: CONCLUSÃO
    // ==========================================
    if (aptData) {
      const { data: cData } = await supabase.from('clients').select('name, whatsapp').eq('id', aptData.client_id).maybeSingle();
      const { data: pData } = await supabase.from('professionals').select('name').eq('id', aptData.professional_id).maybeSingle();
      
      const clientName = cData?.name || 'Cliente';
      const clientWhatsapp = cData?.whatsapp || '';
      const profName = pData?.name || 'O barbeiro';

      // 1. Grava no Log da Home
      await supabase.from('system_logs').insert({
        barbershop_id: barbershopId,
        type: 'success',
        title: 'Atendimento Finalizado',
        message: `${profName} acabou de finalizar o ${aptData.service_name} de ${clientName}.`
      })

      // 2. Grita para o n8n (Fluxo de Pós-Venda)
      if (process.env.N8N_WEBHOOK_URL && clientWhatsapp) {
        fetch(`${process.env.N8N_WEBHOOK_URL}/webhook/pos-venda`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: appointmentId,
            clientId: aptData.client_id,
            clientName: clientName,
            clientWhatsapp: clientWhatsapp,
            professionalName: profName,
            serviceName: aptData.service_name
          })
        }).catch(err => console.error("[SISTEMA] Falha silenciosa ao notificar n8n de pós-venda:", err));
      }
    }

    // 2. Se houver cliente...
    if (clientId) {
      // 2.1 Finaliza as compras pendentes do Shop
      await supabase
        .from('shop_orders')
        .update({ status: 'completed' })
        .eq('client_id', clientId)
        .eq('status', 'pending_pickup')
        
      // 2.2 INTELIGÊNCIA: Recalcula o Ciclo Pessoal dele (LTV Predict)
      await recalculateClientCycle(clientId);
    }

  } catch (error) {
    console.error('Erro no Checkout:', error)
    throw new Error('Falha ao finalizar o atendimento.')
  }

  revalidatePath('/dashboard')
  revalidatePath('/barber')
}