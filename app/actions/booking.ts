'use server'

import { createClient } from '@/utils/supabase/server'

const BARBERSHOP_ID = '11111111-1111-1111-1111-111111111111'

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, '');
}

// Helper para descobrir a duração dos serviços antigos gravados no banco
function getServiceDuration(serviceName: string): number {
  if (serviceName.includes('Combo') || serviceName.includes('Corte + Barba')) return 75;
  if (serviceName.includes('Corte') || serviceName.includes('Fade')) return 45;
  if (serviceName.includes('Barba')) return 30;
  return 30; // fallback padrão
}

// ==========================================
// 1. BUSCA O CLIENTE (AGORA COM LEITURA DA CARTEIRA DE PLANOS)
// ==========================================
export async function checkClientByPhone(phone: string) {
  const supabase = await createClient();
  const cleanedPhone = cleanPhone(phone);

  try {
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, preferences')
      .eq('whatsapp', cleanedPhone)
      .maybeSingle()

    if (client) {
      // Busca último agendamento (Inteligência de repetição)
      const { data: lastApt } = await supabase
        .from('appointments')
        .select('service_name, professional_id')
        .eq('client_id', client.id)
        .order('scheduled_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // BUSCA A CARTEIRA DE PLANOS ATIVOS DO CLIENTE
      const { data: subscriptions } = await supabase
        .from('client_subscriptions')
        .select('id, remaining_cuts, status, plans(name, type)')
        .eq('client_id', client.id)
        .eq('status', 'active');
      
      // Filtra para garantir que pacotes tenham cortes sobrando
      const validSubscription = subscriptions?.find(sub => 
        sub.plans?.type === 'subscription' || 
        (sub.plans?.type === 'package' && (sub.remaining_cuts ?? 0) > 0)
      );

      return { 
        found: true, 
        client: { 
          ...client, 
          lastAppointment: lastApt,
          activeSubscription: validSubscription || null // Devolve o plano se existir!
        } 
      }
    }
    return { found: false }
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return { found: false }
  }
}

// ==========================================
// 2. BUSCA DE HORÁRIOS COM DETECÇÃO DE COLISÃO
// ==========================================
export async function getAvailableSlots(date: string, professionalId: string, newServiceDuration: number) {
  const supabase = await createClient();
  
  const { data: apts } = await supabase
    .from('appointments')
    .select('scheduled_at, service_name')
    .eq('professional_id', professionalId === 'any' ? 'leo' : professionalId)
    .gte('scheduled_at', `${date}T00:00:00-03:00`)
    .lte('scheduled_at', `${date}T23:59:59-03:00`)
    .in('status', ['confirmed', 'completed']);

  const bookedIntervals = apts?.map(a => {
    const d = new Date(a.scheduled_at);
    const localHour = parseInt(d.toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit' }));
    const localMin = parseInt(d.toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', minute: '2-digit' }));
    
    const startMins = (localHour * 60) + localMin;
    const duration = getServiceDuration(a.service_name);
    
    return { start: startMins, end: startMins + duration };
  }) || [];

  const masterSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  const closingTimeMins = 18 * 60 + 30;

  const available = masterSlots.filter(slot => {
    const [h, m] = slot.split(':').map(Number);
    const slotStart = (h * 60) + m;
    const slotEnd = slotStart + newServiceDuration;

    if (slotEnd > closingTimeMins) return false;

    const hasCollision = bookedIntervals.some(booked => {
      return slotStart < booked.end && slotEnd > booked.start;
    });

    return !hasCollision;
  });

  return available;
}

// ==========================================
// 3. REGISTRAR RESERVA (PREPARADO PARA PLANOS E LOG)
// ==========================================
export async function submitBooking(bookingData: {
  name: string; 
  phone: string; 
  serviceName: string; 
  price: number; 
  professionalId: string; 
  date: string; 
  time: string;
  subscriptionId?: string;
}) {
  const supabase = await createClient()
  const cleanedPhone = cleanPhone(bookingData.phone);

  try {
    let { data: client } = await supabase.from('clients').select('id, name').eq('whatsapp', cleanedPhone).maybeSingle()

    if (!client) {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({ barbershop_id: BARBERSHOP_ID, name: bookingData.name, whatsapp: cleanedPhone })
        .select('id, name')
        .single()
      
      if (clientError) throw clientError
      client = newClient
    }

    const scheduledAt = `${bookingData.date}T${bookingData.time}:00-03:00`
    const finalPrice = bookingData.subscriptionId ? 0 : bookingData.price;
    const resolvedProfessionalId = bookingData.professionalId === 'any' ? 'leo' : bookingData.professionalId;

    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        barbershop_id: BARBERSHOP_ID,
        client_id: client.id,
        professional_id: resolvedProfessionalId,
        service_name: bookingData.serviceName,
        price: finalPrice,
        used_subscription_id: bookingData.subscriptionId || null,
        scheduled_at: scheduledAt,
        status: 'confirmed'
      })
      .select('id')
      .single()

    if (aptError) throw aptError

    // ==========================================
    // LOG DE SISTEMA: NOVO AGENDAMENTO (PWA)
    // ==========================================
    // Busca o nome do barbeiro para ficar bonito no log
    const { data: prof } = await supabase.from('professionals').select('name').eq('id', resolvedProfessionalId).single();
    const profName = prof?.name || 'um barbeiro';
    const dateFormatted = bookingData.date.split('-').reverse().join('/'); // Transforma YYYY-MM-DD em DD/MM/YYYY

    await supabase.from('system_logs').insert({
      barbershop_id: BARBERSHOP_ID,
      type: 'info',
      title: 'Novo Agendamento (App)',
      message: `${client.name} agendou um ${bookingData.serviceName} com ${profName} para o dia ${dateFormatted} às ${bookingData.time}.`
    });

    return { success: true, clientId: client.id, appointmentId: appointment.id }
  } catch (error) {
    console.error('Erro ao criar reserva:', error)
    throw new Error('Falha ao processar agendamento.')
  }
}
// ==========================================
// 4. ADICIONAR PRODUTO AO CARRINHO (UPSELL)
// ==========================================
export async function addUpsell(clientId: string, productId: string, price: number) {
  const supabase = await createClient()
  try {
    const { data: order, error: orderError } = await supabase
      .from('shop_orders')
      .insert({ client_id: clientId, total_price: price, status: 'pending_pickup' })
      .select('id')
      .single()

    if (orderError) throw orderError

    const { error: itemError } = await supabase
      .from('order_items')
      .insert({ order_id: order.id, product_id: productId, quantity: 1, price_at_time: price })

    if (itemError) throw itemError

    const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', productId).single()
    if (product) {
      await supabase.from('products').update({ stock_quantity: product.stock_quantity - 1 }).eq('id', productId)
    }

    return { success: true }
  } catch (error) {
    console.error('Erro no upsell:', error)
    throw new Error('Falha ao processar upsell.')
  }
}