import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { updateClientProfile } from '@/app/actions/appointments';
import { logout } from '@/app/actions/auth';
import { assignPlanToClient, cancelClientSubscription } from '@/app/actions/plans';
import CancelPlanButton from '@/app/components/CancelPlanButton'; // <-- NOVO IMPORT

export default async function SmartProfile({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const clientId = resolvedParams.id;
  const supabase = await createClient();

  // 1. BUSCA DADOS DO CLIENTE E CARTEIRA DE PLANOS
  const { data: client } = await supabase
    .from('clients')
    .select(`
      *,
      client_subscriptions (
        id, status, remaining_cuts, valid_until, purchased_at,
        plans (name, type)
      )
    `)
    .eq('id', clientId)
    .single();

  if (!client) {
    return <div className="p-10 text-center font-bold text-slate-500">Cliente não encontrado.</div>;
  }

  // Filtra apenas o plano ativo atual dele
  const activeSubscription = client.client_subscriptions?.find((sub: any) => sub.status === 'active');

  // 2. BUSCA PLANOS DISPONÍVEIS PARA VENDA
  const { data: availablePlans } = await supabase
    .from('plans')
    .select('id, name, price, type, cuts_included')
    .eq('active', true)
    .order('price', { ascending: false });

  // 3. BUSCA HISTÓRICO DE CORTES E SHOP
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, professionals(name)')
    .eq('client_id', clientId)
    .in('status', ['completed', 'confirmed', 'no_show'])
    .order('scheduled_at', { ascending: false });

  const { data: shopOrders } = await supabase
    .from('shop_orders')
    .select('*, order_items(*, products(name))')
    .eq('client_id', clientId)
    .in('status', ['completed', 'pending_pickup'])
    .order('created_at', { ascending: false });

  // CÁLCULOS DE LTV
  const completedCuts = appointments?.filter(a => a.status === 'completed') || [];
  const completedOrders = shopOrders?.filter(o => o.status === 'completed') || [];

  const totalSpentCuts = completedCuts.reduce((acc, curr) => acc + Number(curr.price), 0);
  const totalSpentShop = completedOrders.reduce((acc, curr) => acc + Number(curr.total_price), 0);
  const lifetimeValue = totalSpentCuts + totalSpentShop;

  let daysSinceLastVisit = 0;
  let riskOfChurn = false;
  if (completedCuts.length > 0) {
    const lastVisit = new Date(completedCuts[0].scheduled_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastVisit.getTime());
    daysSinceLastVisit = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    riskOfChurn = daysSinceLastVisit > (client.average_cycle_days || 30) + 5; 
  }

  const timeline = [
    ...(appointments || []).map(a => ({ type: 'cut', date: a.scheduled_at, data: a })),
    ...(shopOrders || []).map(o => ({ type: 'shop', date: o.created_at, data: o }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDateBR = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans text-slate-800">
      
      <aside className="hidden md:flex w-64 flex-col p-6 bg-white/40 backdrop-blur-xl border-r border-slate-200/60 shadow-xl z-20">
        <div className="mb-10 px-2">
          <h1 className="text-2xl font-black tracking-tighter text-slate-900">BarberMind</h1>
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Smart Engine</p>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition"><span>🏠</span> Visão Geral</Link>
          <Link href="/dashboard/agenda" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition"><span>📅</span> Agenda</Link>
          <Link href="/dashboard/finance" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition"><span>💰</span> Financeiro (DRE)</Link>
          <Link href="/dashboard/plans" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition"><span>💎</span> Planos & Clube</Link>
          <Link href="/dashboard/new" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition"><span>➕</span> Novo Encaixe</Link>
          <Link href="/dashboard/products" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition"><span>🛒</span> Estoque e Shop</Link>
          <Link href="/dashboard/clients" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-sm text-slate-900 font-bold transition border border-slate-100"><span>👥</span> Base de Clientes</Link>
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

      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="flex justify-between items-center">
            <Link href="/dashboard/clients" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-sm font-bold text-slate-500 hover:text-slate-800 hover:shadow-md transition-all">
              &larr; Base de Clientes
            </Link>
            <span className="px-4 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 flex items-center gap-2">
              🧠 Smart Profile
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUNA ESQUERDA: PERFIL, CARTEIRA E FORMULÁRIO */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* CARD DO PERFIL PRINCIPAL */}
              <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-500 to-purple-600 -z-10"></div>
                
                <div className="w-28 h-28 mx-auto rounded-full bg-cover bg-center border-4 border-white shadow-xl mt-8 mb-4" style={{ backgroundImage: `url('https://i.pravatar.cc/150?u=${client.id}')` }}></div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{client.name}</h1>
                <p className="text-sm font-bold text-slate-500 mb-6">{client.whatsapp}</p>

                <div className="flex flex-wrap justify-center gap-2 mb-2">
                  {lifetimeValue > 500 && <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200 shadow-sm">👑 Cliente VIP</span>}
                  {completedOrders.length > 0 && <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 shadow-sm">🛍️ Comprador Shop</span>}
                  {riskOfChurn && <span className="text-[10px] font-black bg-red-100 text-red-700 px-3 py-1 rounded-full border border-red-200 shadow-sm animate-pulse">⚠️ Risco de Evasão</span>}
                </div>
                {client.average_cycle_days > 0 && (
                  <p className="text-xs font-bold text-slate-400 mt-4">Retorna a cada <span className="text-indigo-600">{client.average_cycle_days} dias</span></p>
                )}
              </div>

              {/* MÓDULO DO CLUBE DE ASSINATURAS (CARTEIRA) */}
              <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-500/30 rounded-full blur-2xl"></div>
                
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                  💎 Clube & Pacotes
                </h3>

                {activeSubscription ? (
                  <div className="bg-white/10 border border-white/20 rounded-2xl p-4 relative z-10 group">
                     <div className="flex justify-between items-start">
                       <div>
                         <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Plano Ativo</p>
                         <h4 className="text-lg font-black text-white">{activeSubscription.plans.name}</h4>
                       </div>
                       
                      {/* BOTÃO DE CANCELAMENTO INTERATIVO */}
                       <CancelPlanButton 
                         cancelAction={cancelClientSubscription.bind(null, activeSubscription.id, client.id)} 
                       />
                     </div>
                     
                     {activeSubscription.plans.type === 'package' && (
                       <div className="mt-4 flex items-end justify-between">
                         <div>
                           <p className="text-[10px] text-slate-400 uppercase font-bold">Cortes Restantes</p>
                           <p className="text-2xl font-black text-amber-400">{activeSubscription.remaining_cuts}</p>
                         </div>
                         <span className="text-2xl">✂️</span>
                       </div>
                     )}

                     {activeSubscription.plans.type === 'subscription' && activeSubscription.valid_until && (
                       <div className="mt-4">
                         <p className="text-[10px] text-slate-400 uppercase font-bold">Vence em</p>
                         <p className="text-sm font-black text-emerald-400">{formatDateBR(activeSubscription.valid_until)}</p>
                       </div>
                     )}
                  </div>
                ) : (
                  <form action={assignPlanToClient.bind(null, client.id)} className="relative z-10">
                    <p className="text-xs text-slate-400 font-medium mb-4">Cliente não possui plano ativo.</p>
                    <select name="plan_id" required className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500 mb-3 appearance-none">
                      <option value="" className="text-slate-900">Selecione um plano para vender...</option>
                      {availablePlans?.map(plan => (
                        <option key={plan.id} value={plan.id} className="text-slate-900">
                          {plan.name} - R$ {plan.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/30">
                      Vender Plano
                    </button>
                  </form>
                )}
              </div>

              {/* FORMULÁRIO DE PREFERÊNCIAS */}
              <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">⚙️ Ficha Técnica</h3>
                
                <form action={updateClientProfile.bind(null, client.id)} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</label>
                    <input type="text" name="name" defaultValue={client.name} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</label>
                      <input type="text" name="whatsapp" defaultValue={client.whatsapp} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nascimento</label>
                      <input type="date" name="birth_date" defaultValue={client.birth_date} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Mapeamento Capilar</h4>
                    
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input type="checkbox" name="usa_pomada" defaultChecked={client.preferences?.usa_pomada} className="sr-only peer" />
                          <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 transition-colors"></div>
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Usa Pomada Modeladora</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input type="checkbox" name="falhas_barba" defaultChecked={client.preferences?.falhas_barba} className="sr-only peer" />
                          <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 transition-colors"></div>
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Possui falhas na barba</span>
                      </label>

                      <div className="space-y-2 mt-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Pele / Couro</label>
                        <select name="tipo_pele" defaultValue={client.preferences?.tipo_pele || 'normal'} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 appearance-none">
                          <option value="normal">Normal</option>
                          <option value="oleosa">Oleosa</option>
                          <option value="seca">Seca / Sensível</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="w-full mt-6 py-4 bg-slate-100 text-slate-700 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-transform active:scale-95">
                    Atualizar Ficha
                  </button>
                </form>
              </div>
            </div>

            {/* COLUNA DIREITA: LTV E LINHA DO TEMPO */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* CARDS DE PERFORMANCE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
                  <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                  <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-2">Lifetime Value (LTV)</p>
                  <p className="text-3xl font-black">R$ {lifetimeValue.toFixed(2).replace('.', ',')}</p>
                  <p className="text-xs font-bold opacity-50 mt-1">Total gasto na barbearia</p>
                </div>

                <div className="bg-white/70 backdrop-blur-3xl border border-white p-6 rounded-[2rem] shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Serviços Feitos</p>
                  <p className="text-3xl font-black text-slate-900">{completedCuts.length}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1">Cortes e Barbas</p>
                </div>

                <div className="bg-white/70 backdrop-blur-3xl border border-white p-6 rounded-[2rem] shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Produtos Comprados</p>
                  <p className="text-3xl font-black text-indigo-600">{completedOrders.length}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1">Via Smart Shop</p>
                </div>
              </div>

              {/* LINHA DO TEMPO */}
              <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 md:p-10">
                <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
                  📜 Histórico de Consumo
                </h3>

                {timeline.length === 0 ? (
                  <div className="text-center py-10">
                    <span className="text-4xl mb-4 block">👻</span>
                    <p className="text-slate-500 font-bold">Nenhum histórico registrado para este cliente.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
                    {timeline.map((item, index) => (
                      <div key={index} className="relative pl-8 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 100}ms` }}>
                        
                        <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${item.type === 'shop' ? 'bg-indigo-500' : (item.data.status === 'completed' ? 'bg-green-500' : 'bg-slate-300')}`}></div>
                        
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:bg-white transition-colors hover:shadow-md cursor-default">
                          
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {formatDateBR(item.date)}
                            </p>
                            <span className="text-xs font-black text-slate-900">
                              R$ {item.type === 'shop' ? item.data.total_price : item.data.price}
                            </span>
                          </div>

                          {item.type === 'cut' ? (
                            <div>
                              <p className="text-base font-bold text-slate-800">{item.data.service_name}</p>
                              <p className="text-xs font-bold text-slate-500 mt-1">
                                Atendido por <span className="text-indigo-600">{item.data.professionals?.name || 'Desconhecido'}</span>
                              </p>
                              
                              <div className="mt-3 flex gap-2">
                                {item.data.status === 'completed' && <span className="bg-green-50 text-green-700 border border-green-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Concluído</span>}
                                {item.data.status === 'no_show' && <span className="bg-red-50 text-red-700 border border-red-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Faltou</span>}
                                {item.data.status === 'confirmed' && <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase animate-pulse">Agendado Futuro</span>}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-base font-bold text-indigo-700 flex items-center gap-2">
                                <span>🛍️</span> Compra no Shop
                              </p>
                              <ul className="mt-2 space-y-1">
                                {item.data.order_items.map((oi: any) => (
                                  <li key={oi.id} className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                    {oi.quantity}x {oi.products?.name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}