import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  const { action, data, apiKey } = await req.json();

  // Segurança: Só o seu n8n pode chamar essa rota
  if (apiKey !== process.env.WEBHOOK_SECRET) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = await createClient();

  switch (action) {
    
    // ==========================================
    // FLUXO DE AVALIAÇÃO (PÓS-ATENDIMENTO)
    // ==========================================
    
    // 1. n8n pergunta: "O João já avaliou o salão alguma vez?"
    case 'CHECK_REVIEW_ELIGIBILITY':
      const { data: client } = await supabase
        .from('clients')
        .select('has_reviewed_google, review_requests_sent')
        .eq('id', data.clientId)
        .single();

      // Regra de Ouro: Só pede avaliação se ele nunca avaliou E se pedimos menos de 2 vezes na vida.
      const shouldAsk = client && !client.has_reviewed_google && client.review_requests_sent < 2;

      if (shouldAsk) {
        // Marca que estamos pedindo mais uma vez
        await supabase
          .from('clients')
          .update({ review_requests_sent: (client.review_requests_sent || 0) + 1 })
          .eq('id', data.clientId);
      }

      return Response.json({ shouldAsk });

    // 2. n8n avisa: "O João clicou no link e avaliou!" ou a IA identificou que ele disse "Já avaliei!"
    case 'MARK_REVIEW_DONE':
      await supabase
        .from('clients')
        .update({ has_reviewed_google: true })
        .eq('id', data.clientId);
      
      return Response.json({ success: true, message: 'Cliente marcado como avaliador!' });

    // (Aqui ficariam as outras ações que falamos antes, como CHECK_AVAILABILITY, etc)
    
    default:
      return Response.json({ error: 'Ação inválida' }, { status: 400 });
  }
}