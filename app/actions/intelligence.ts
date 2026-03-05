'use server'

import { createClient } from '@/utils/supabase/server'

const BARBERSHOP_ID = '11111111-1111-1111-1111-111111111111'

// ==========================================
// 1. ALGORITMO DE CICLO PESSOAL
// Roda toda vez que o barbeiro dá "Checkout / Receber"
// ==========================================
export async function recalculateClientCycle(clientId: string) {
  const supabase = await createClient();

  try {
    // Busca todos os cortes concluídos do cliente, do mais antigo pro mais novo
    const { data: appointments } = await supabase
      .from('appointments')
      .select('scheduled_at')
      .eq('client_id', clientId)
      .in('status', ['completed'])
      .order('scheduled_at', { ascending: true });

    if (!appointments || appointments.length < 2) {
      // Se ele só tem 1 corte, não temos como calcular média. Assume 30 dias por padrão.
      await supabase.from('clients').update({ average_cycle_days: 30 }).eq('id', clientId);
      return;
    }

    // Calcula a diferença de dias entre cada corte
    let totalDays = 0;
    let intervals = 0;

    for (let i = 1; i < appointments.length; i++) {
      const date1 = new Date(appointments[i - 1].scheduled_at);
      const date2 = new Date(appointments[i].scheduled_at);
      
      const diffTime = Math.abs(date2.getTime() - date1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Ignora anomalias (ex: o cara voltou no dia seguinte pra consertar o pézinho)
      if (diffDays > 3) {
        totalDays += diffDays;
        intervals++;
      }
    }

    const averageCycle = intervals > 0 ? Math.round(totalDays / intervals) : 30;

    // Atualiza a ficha do cliente com o tempo exato dele
    await supabase
      .from('clients')
      .update({ average_cycle_days: averageCycle })
      .eq('id', clientId);

  } catch (error) {
    console.error("Erro ao recalcular ciclo:", error);
  }
}

// ==========================================
// 2. ADICIONAR À FILA DE ESPERA (PWA)
// Roda quando o cliente vê a agenda cheia e clica em "Me avise"
// ==========================================
export async function joinWaitlist(clientId: string, date: string, professionalId: string) {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase.from('waitlist').insert({
      barbershop_id: BARBERSHOP_ID,
      client_id: clientId,
      professional_id: professionalId,
      desired_date: date,
      status: 'waiting'
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Erro ao entrar na fila:", error);
    return { success: false };
  }
}

// ==========================================
// 3. CAÇADOR DE ESPERA (Roda quando alguém CANCELA)
// ==========================================
export async function checkWaitlistForCanceledSlot(date: string, professionalId: string) {
  const supabase = await createClient();
  
  try {
    const { data: waitingClients } = await supabase
      .from('waitlist')
      .select('id, clients(id, name, whatsapp)')
      .eq('desired_date', date)
      .in('professional_id', [professionalId, 'any'])
      .eq('status', 'waiting');

    return waitingClients || [];
    // OBS: Quando o N8N estiver pronto, aqui nós faremos um fetch(N8N_WEBHOOK_URL) 
    // enviando essa lista de clientes para a IA mandar WhatsApp para eles!
  } catch (error) {
    console.error("Erro ao buscar fila:", error);
    return [];
  }
}