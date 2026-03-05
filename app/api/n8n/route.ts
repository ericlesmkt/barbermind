import { createClient } from '@/utils/supabase/server';

// Uma chave secreta para garantir que só o seu n8n consegue fazer esta pergunta
const N8N_SECRET = process.env.N8N_SECRET_KEY || 'barbermind_secret_123';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload, secret } = body;

    // Proteção de segurança
    if (secret !== N8N_SECRET) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = await createClient();

    switch (action) {
      // 1. n8n pergunta: O cliente pode receber o pedido de avaliação?
      case 'CHECK_REVIEW_ELIGIBILITY':
        const { data: client } = await supabase
          .from('clients')
          .select('has_reviewed_google, review_requests_sent')
          .eq('id', payload.clientId)
          .single();

        if (!client) return Response.json({ shouldAsk: false });

        // Regra de Ouro: O cliente nunca avaliou E nós não o chateámos mais de 1 vez.
        const shouldAsk = !client.has_reviewed_google && (client.review_requests_sent || 0) < 2;

        if (shouldAsk) {
          // Já marcamos no banco que estamos a pedir agora, para não pedir de novo no próximo corte se ele ignorar
          await supabase
            .from('clients')
            .update({ review_requests_sent: (client.review_requests_sent || 0) + 1 })
            .eq('id', payload.clientId);
        }

        return Response.json({ shouldAsk });

      default:
        return Response.json({ error: 'Ação desconhecida' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}