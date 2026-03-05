import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/actions/auth';
import { checkoutAppointment } from '@/app/actions/appointments';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const resolvedParams = await searchParams;
  const period = resolvedParams?.period || 'day'; 
  
  const supabase = await createClient();

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const todayStart = new Date(`${todayStr}T00:00:00-03:00`);
  const todayEnd = new Date(`${todayStr}T23:59:59.999-03:00`);

  let startDate = new Date(todayStart);
  if (period === 'week') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (period === 'month') {
    startDate.setDate(1);
  } else if (period === 'year') {
    startDate.setMonth(0, 1);
  }

  // 1. Receita
  const { data: revenueData, count } = await supabase
    .from('appointments')
    .select('price', { count: 'exact' })
    .in('status', ['confirmed', 'completed'])
    .gte('scheduled_at', startDate.toISOString());

  const totalRevenue = revenueData?.reduce((acc, curr) => acc + Number(curr.price), 0) || 0;
  const totalAppointments = count || 0;
  const ticketMedio = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

  // 2. Feed Inteligente (Cérebro restaurado com JSONB)
  const { data: clientsLog } = await supabase
    .from('clients')
    .select('*')
    .order('last_visit_date', { ascending: false })
    .limit(5);

  const todayDay = parseInt(todayStr.split('-')[2]); 
  const todayMonth = parseInt(todayStr.split('-')[1]) - 1; 

  // 3. VISÃO DO SALÃO COM INTELIGÊNCIA LOGÍSTICA (SHOP)
  const { data: todaysAppointments } = await supabase
    .from('appointments')
    .select('*, clients(id, name, whatsapp)')
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .eq('status', 'confirmed') 
    .order('scheduled_at', { ascending: true });

  // Busca pedidos pendentes do Shop para cruzar com a agenda de hoje
  let pendingOrders: any[] = [];
  if (todaysAppointments && todaysAppointments.length > 0) {
    const clientIds = todaysAppointments.map(a => a.clients?.id).filter(Boolean);
    if (clientIds.length > 0) {
      const { data: orders } = await supabase
        .from('shop_orders')
        .select('*, order_items(*, products(name))')
        .in('client_id', clientIds)
        .eq('status', 'pending_pickup');
      pendingOrders = orders || [];
    }
  }

  // Injeta o pedido dentro do agendamento para a recepção saber
  const getFila = (profId: string) => {
    const fila = todaysAppointments?.filter(a => a.professional_id === profId).map(apt => {
      const clientOrder = pendingOrders.find(o => o.client_id === apt.clients?.id);
      return { ...apt, pendingOrder: clientOrder || null };
    }) || [];
    
    return { atual: fila[0] || null, proximo: fila[1] || null };
  };

  const filaLeo = getFila('leo');
  const filaMarcos = getFila('marcos');

  // ==========================================
  // 4. SISTEMA DE NOTIFICAÇÕES (REAL-TIME LOGS)
  // ==========================================
  const { data: systemLogs } = await supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  // FUNÇÕES AUXILIARES
  const isReminderSent = (scheduledAt: string) => {
    const timeDiff = new Date(scheduledAt).getTime() - new Date().getTime();
    const hoursLeft = timeDiff / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 3; 
  };

  const formatTimeBR = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  };

  // Calcula o tempo relativo para o Log (ex: "Há 5 min")
  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const logDate = new Date(dateString);
    const diffMs = now.getTime() - logDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    return 'Ontem';
  };

  const currentHour = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: 'America/Sao_Paulo', hour12: false, hour: 'numeric' }));
  let greeting = "Bom dia";
  if (currentHour >= 12 && currentHour < 18) greeting = "Boa tarde";
  else if (currentHour >= 18) greeting = "Boa noite";

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans text-slate-800">
      
      {/* SIDEBAR COM O NOVO MENU FINANCEIRO */}
      <aside className="hidden md:flex w-64 flex-col p-6 bg-white/40 backdrop-blur-xl border-r border-slate-200/60 shadow-xl z-20">
        <div className="mb-10 px-2">
          <h1 className="text-2xl font-black tracking-tighter text-slate-900">BarberMind</h1>
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Smart Engine</p>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-sm text-slate-900 font-bold transition border border-slate-100">
            <span>🏠</span> Visão Geral
          </Link>
          <Link href="/dashboard/agenda" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition">
            <span>📅</span> Agenda
          </Link>
          <Link href="/dashboard/finance" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition">
            <span>💰</span> Financeiro (DRE)
          </Link>
          <Link href="/dashboard/plans" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition">
            <span>💎</span> Planos & Clube
          </Link>
          <Link href="/dashboard/new" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition">
            <span>➕</span> Novo Encaixe
          </Link>
          <Link href="/dashboard/products" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition">
            <span>🛒</span> Estoque e Shop
          </Link>
          <Link href="/dashboard/clients" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition">
            <span>👥</span> Base de Clientes
          </Link>
          <div className="pt-4 pb-2">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">Equipe</p>
             <Link href="/dashboard/ranking" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-amber-600 hover:bg-amber-50 hover:text-amber-700 font-black transition group">
                <span className="group-hover:scale-110 transition-transform">🏆</span> Placar Mensal
             </Link>
          </div>
        </nav>
        <div className="mt-auto space-y-4">
          <form action={logout}>
            <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-white hover:text-red-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all active:scale-95 group">
              <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sair do Sistema
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-4 md:p-10 overflow-y-auto relative">
        <div className="max-w-6xl mx-auto w-full flex-1">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{greeting}!</h2>
              <p className="text-slate-500 font-medium">Acompanhe a performance do seu negócio.</p>
            </div>
            
            <div className="flex bg-slate-200/50 p-1 rounded-xl shadow-inner border border-slate-300/30">
              {[
                { id: 'day', label: 'Hoje' },
                { id: 'week', label: '7 Dias' },
                { id: 'month', label: 'Este Mês' },
                { id: 'year', label: 'Ano' }
              ].map((p) => (
                <Link 
                  key={p.id}
                  href={`/dashboard?period=${p.id}`}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${period === p.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </header>

          <div key={period} className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="lg:col-span-2 space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* FATURAMENTO BRUTO */}
                <section className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 relative overflow-hidden group/card">
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-green-200/20 rounded-full blur-3xl transition-transform group-hover/card:scale-110"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Faturamento Bruto</h4>
                      <label className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors z-20">
                        <input type="checkbox" className="sr-only peer" defaultChecked={true} />
                        <svg viewBox="0 0 24 24" className="w-4 h-4 hidden peer-checked:block" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 block peer-checked:hidden" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </label>
                    </div>
                    <div className="group-has-[:checked]/card:hidden animate-in fade-in duration-300">
                      <p className="text-5xl font-black text-[#1a1d2d]">R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="hidden group-has-[:checked]/card:block animate-in fade-in duration-300">
                      <p className="text-5xl font-black text-[#1a1d2d]">R$ •••••</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-green-600 font-bold text-xs uppercase">
                      <span className="bg-green-50 px-2 py-1 rounded-lg border border-green-100 tracking-widest">{totalAppointments} Atendimentos</span>
                    </div>
                  </div>
                </section>

                {/* TICKET MÉDIO */}
                <section className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 relative overflow-hidden group/card2">
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-200/20 rounded-full blur-3xl transition-transform group-hover/card2:scale-110"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ticket Médio</h4>
                      <label className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors z-20">
                        <input type="checkbox" className="sr-only peer" defaultChecked={true} />
                        <svg viewBox="0 0 24 24" className="w-4 h-4 hidden peer-checked:block" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 block peer-checked:hidden" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </label>
                    </div>
                    <div className="group-has-[:checked]/card2:hidden animate-in fade-in duration-300">
                      <p className="text-5xl font-black text-[#1a1d2d]">R$ {ticketMedio.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="hidden group-has-[:checked]/card2:block animate-in fade-in duration-300">
                      <p className="text-5xl font-black text-[#1a1d2d]">R$ •••••</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase">
                      <span className="bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 tracking-widest">Baseado no período</span>
                    </div>
                  </div>
                </section>
              </div>

              {/* ========================================= */}
              {/* VISÃO DO SALÃO COM LOGÍSTICA COMPLETA       */}
              {/* ========================================= */}
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Visão do Salão (Agora)
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* CADEIRA 1: LEO */}
                  <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-5 flex flex-col transition-all hover:bg-white hover:shadow-xl relative group/chair">
                    <Link href="/dashboard/agenda?professional=leo" className="absolute inset-0 z-0 rounded-[2rem]" title="Ver Agenda do Léo"></Link>
                    
                    <div className="flex items-center gap-4 relative z-10 pointer-events-none mb-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-cover bg-center shadow-md border-2 border-white" style={{ backgroundImage: "url('https://i.pravatar.cc/150?img=11')" }}></div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${filaLeo.atual ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                          Cadeira 01 • Léo <span className="text-indigo-500 font-bold tracking-normal hidden group-hover/chair:block">Ver Agenda ➔</span>
                        </p>
                        {filaLeo.atual ? (
                          <>
                            <p className="text-base font-black text-slate-900 truncate">{filaLeo.atual.clients?.name || 'Cliente Sem Nome'}</p>
                            <p className="text-xs font-bold text-indigo-600 truncate">{filaLeo.atual.service_name} • {formatTimeBR(filaLeo.atual.scheduled_at)}</p>
                          </>
                        ) : (
                          <p className="text-base font-black text-slate-400 mt-1">Cadeira Livre</p>
                        )}
                      </div>
                    </div>
                    
                    {/* SE TEM CLIENTE: AVISO DE PRODUTO + BOTÃO DE RECEBER */}
                    {filaLeo.atual ? (
                      <div className="mt-auto border-t border-slate-200/60 pt-4 relative z-10 space-y-3">
                        {filaLeo.atual.pendingOrder && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                            <span className="text-sm">📦</span>
                            <div>
                              <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Entregar Produto</p>
                              {filaLeo.atual.pendingOrder.order_items.map((item: any) => (
                                <p key={item.id} className="text-xs font-bold text-amber-900">{item.quantity}x {item.products?.name}</p>
                              ))}
                            </div>
                          </div>
                        )}
                        <form action={checkoutAppointment.bind(null, filaLeo.atual.id, filaLeo.atual.clients?.id)}>
                          <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-green-500/30 transition-transform active:scale-95">
                            💸 Receber e Finalizar
                          </button>
                        </form>
                      </div>
                    ) : filaLeo.proximo ? (
                      <div className="mt-4 pt-4 border-t border-slate-200/60 relative z-10">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Próximo da Fila
                          </p>
                          {isReminderSent(filaLeo.proximo.scheduled_at) ? (
                            <span className="text-[9px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">✓ Notificado 🤖</span>
                          ) : (
                            <button className="pointer-events-auto text-[9px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded shadow-sm hover:bg-indigo-700 transition">📱 Disparar</button>
                          )}
                        </div>
                        <div className="flex justify-between items-end pointer-events-none">
                          <div>
                            <p className="text-sm font-bold text-slate-800 truncate">{filaLeo.proximo.clients?.name}</p>
                            <p className="text-xs font-medium text-slate-500">{filaLeo.proximo.service_name}</p>
                          </div>
                          <p className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                            {formatTimeBR(filaLeo.proximo.scheduled_at)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-slate-200/60 relative z-10">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 pointer-events-none">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Próximo da Fila
                          </p>
                          <Link href="/dashboard/new" className="pointer-events-auto text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded shadow-sm hover:bg-amber-100 transition border border-amber-200 flex items-center gap-1">
                            🔥 Captar Cliente
                          </Link>
                        </div>
                        <div className="flex justify-between items-end pointer-events-none">
                          <div>
                            <p className="text-sm font-bold text-slate-400">Cadeira Livre</p>
                            <p className="text-xs font-medium text-slate-400">Nenhum agendamento previsto</p>
                          </div>
                          <p className="text-sm font-black text-slate-400 bg-slate-100/50 border border-slate-100 px-2 py-1 rounded-lg">--:--</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CADEIRA 2: MARCOS */}
                  <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-5 flex flex-col transition-all hover:bg-white hover:shadow-xl relative group/chair">
                    <Link href="/dashboard/agenda?professional=marcos" className="absolute inset-0 z-0 rounded-[2rem]" title="Ver Agenda do Marcos"></Link>
                    
                    <div className="flex items-center gap-4 relative z-10 pointer-events-none mb-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-cover bg-center shadow-md border-2 border-white" style={{ backgroundImage: "url('https://i.pravatar.cc/150?img=12')" }}></div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${filaMarcos.atual ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                          Cadeira 02 • Marcos <span className="text-indigo-500 font-bold tracking-normal hidden group-hover/chair:block">Ver Agenda ➔</span>
                        </p>
                        {filaMarcos.atual ? (
                          <>
                            <p className="text-base font-black text-slate-900 truncate">{filaMarcos.atual.clients?.name || 'Cliente Sem Nome'}</p>
                            <p className="text-xs font-bold text-indigo-600 truncate">{filaMarcos.atual.service_name} • {formatTimeBR(filaMarcos.atual.scheduled_at)}</p>
                          </>
                        ) : (
                          <p className="text-base font-black text-slate-400 mt-1">Cadeira Livre</p>
                        )}
                      </div>
                    </div>
                    
                    {filaMarcos.atual ? (
                      <div className="mt-auto border-t border-slate-200/60 pt-4 relative z-10 space-y-3">
                        {filaMarcos.atual.pendingOrder && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                            <span className="text-sm">📦</span>
                            <div>
                              <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Entregar Produto</p>
                              {filaMarcos.atual.pendingOrder.order_items.map((item: any) => (
                                <p key={item.id} className="text-xs font-bold text-amber-900">{item.quantity}x {item.products?.name}</p>
                              ))}
                            </div>
                          </div>
                        )}
                        <form action={checkoutAppointment.bind(null, filaMarcos.atual.id, filaMarcos.atual.clients?.id)}>
                          <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-green-500/30 transition-transform active:scale-95">
                            💸 Receber e Finalizar
                          </button>
                        </form>
                      </div>
                    ) : filaMarcos.proximo ? (
                      <div className="mt-4 pt-4 border-t border-slate-200/60 relative z-10">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 pointer-events-none">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Próximo da Fila
                          </p>
                          {isReminderSent(filaMarcos.proximo.scheduled_at) ? (
                            <span className="text-[9px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 flex items-center gap-1 pointer-events-none">✓ Notificado 🤖</span>
                          ) : (
                            <button className="pointer-events-auto text-[9px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded shadow-sm hover:bg-indigo-700 active:scale-95 transition flex items-center gap-1">📱 Disparar</button>
                          )}
                        </div>
                        <div className="flex justify-between items-end pointer-events-none">
                          <div>
                            <p className="text-sm font-bold text-slate-800 truncate">{filaMarcos.proximo.clients?.name}</p>
                            <p className="text-xs font-medium text-slate-500">{filaMarcos.proximo.service_name}</p>
                          </div>
                          <p className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                            {formatTimeBR(filaMarcos.proximo.scheduled_at)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-slate-200/60 relative z-10">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 pointer-events-none">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Próximo da Fila
                          </p>
                          <Link href="/dashboard/new" className="pointer-events-auto text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded shadow-sm hover:bg-amber-100 transition border border-amber-200 flex items-center gap-1">
                            🔥 Captar Cliente
                          </Link>
                        </div>
                        <div className="flex justify-between items-end pointer-events-none">
                          <div>
                            <p className="text-sm font-bold text-slate-400">Cadeira Livre</p>
                            <p className="text-xs font-medium text-slate-400">Nenhum agendamento previsto</p>
                          </div>
                          <p className="text-sm font-black text-slate-400 bg-slate-100/50 border border-slate-100 px-2 py-1 rounded-lg">--:--</p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* SISTEMA DE NOTIFICAÇÕES (AGORA COM SCROLL) */}
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Sistema de Notificações
                </h3>
                <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-2 max-h-[350px] overflow-y-auto scrollbar-hide">
                  {systemLogs?.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 font-bold text-xs">
                      Tudo tranquilo por enquanto.
                    </div>
                  ) : (
                    systemLogs?.map((log) => (
                      <div key={log.id} className="p-4 border-b border-slate-100 last:border-0 hover:bg-white/50 transition-all rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 shadow-sm ${log.type === 'alert' ? 'bg-red-500' : log.type === 'success' ? 'bg-green-500' : 'bg-blue-400'}`}></div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-xs font-bold text-slate-900">{log.title}</p>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{getRelativeTime(log.created_at)}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">{log.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* FEED INTELIGENTE DA IA */}
            <div className="lg:col-span-1">
              <section className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 h-full min-h-[500px]">
                <div className="flex justify-between items-center mb-8 px-2">
                  <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Feed Inteligente</h4>
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
                </div>
                <div className="space-y-6">
                  {clientsLog?.map((client) => {
                    let smartInsight = "Corte Recorrente";
                    let badgeColor = "text-indigo-600 bg-indigo-50 border-indigo-100";

                    return (
                      <Link href={`/dashboard/clients/${client.id}`} key={client.id} className="block group">
                        <div className="flex gap-4 items-center p-3 rounded-2xl hover:bg-white transition-all border border-transparent hover:border-slate-100 shadow-sm hover:shadow-md">
                          <div className="w-12 h-12 rounded-full bg-cover bg-center shadow-sm flex-shrink-0" style={{ backgroundImage: `url('https://i.pravatar.cc/150?u=${client.id}')` }}></div>
                          <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-slate-900 truncate">{client.name}</p>
                            <p className={`text-[10px] font-extrabold uppercase tracking-tight px-2 py-0.5 rounded-lg border inline-block mt-0.5 ${badgeColor}`}>
                              {smartInsight}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}