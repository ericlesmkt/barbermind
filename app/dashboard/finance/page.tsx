import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/actions/auth';
import { addExpense, toggleExpensePayment, deleteExpense, getBarberStatement, addBarberAdvance, settleBarberAccount } from '@/app/actions/finance';
import SettleButton from '@/app/components/SettleButton';

export default async function FinanceDashboard() {
  const supabase = await createClient();

  // 1. Lógica de Datas (Mês Atual no Fuso do Brasil)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const year = todayStr.split('-')[0];
  const month = todayStr.split('-')[1];
  
  const startOfMonth = new Date(`${year}-${month}-01T00:00:00-03:00`).toISOString();
  const endOfMonth = new Date(Number(year), Number(month), 0, 23, 59, 59).toISOString();

  // ==========================================
  // BUSCA E CÁLCULO DE FATURAÇÃO (RECEITAS)
  // ==========================================
  const { data: appointments } = await supabase
    .from('appointments')
    .select('price, professionals(commission_rate)')
    .eq('status', 'completed')
    .gte('scheduled_at', startOfMonth)
    .lte('scheduled_at', endOfMonth);

  let totalCutsRevenue = 0;
  let totalCommissionsPaid = 0;

  appointments?.forEach(apt => {
    const price = Number(apt.price);
    const rate = apt.professionals?.commission_rate ? Number(apt.professionals.commission_rate) : 0.5;
    totalCutsRevenue += price;
    totalCommissionsPaid += (price * rate);
  });

  const { data: shopOrders } = await supabase
    .from('shop_orders')
    .select('total_price, order_items(quantity, products(cost_price))')
    .eq('status', 'completed')
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth);

  let totalShopRevenue = 0;
  let totalProductsCost = 0;

  shopOrders?.forEach(order => {
    totalShopRevenue += Number(order.total_price);
    order.order_items?.forEach((item: any) => {
      const qty = Number(item.quantity);
      const cost = Number(item.products?.cost_price || 0);
      totalProductsCost += (qty * cost);
    });
  });

  // ==========================================
  // BUSCA E CÁLCULO DE DESPESAS OPERACIONAIS
  // ==========================================
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .gte('due_date', `${year}-${month}-01`)
    .lte('due_date', `${year}-${month}-31`)
    .order('due_date', { ascending: true });

  const totalExpenses = expenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
  const paidExpenses = expenses?.filter(e => e.is_paid).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

  // ==========================================
  // DRE MATEMÁTICA
  // ==========================================
  const grossRevenue = totalCutsRevenue + totalShopRevenue;
  const directCosts = totalCommissionsPaid + totalProductsCost;
  const grossProfit = grossRevenue - directCosts; 
  const netProfit = grossProfit - totalExpenses; 
  const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  const formatMoney = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  // ==========================================
  // ACERTO DE BARBEIROS (O NOVO MÓDULO)
  // ==========================================
  const { data: professionals } = await supabase
    .from('professionals')
    .select('id, name, avatar')
    .eq('active', true);

  // Fazemos um loop inteligente para calcular o extrato de cada barbeiro ativo
  const barberStatements = await Promise.all(
    (professionals || []).map(async (prof) => {
      const statement = await getBarberStatement(prof.id);
      return { ...prof, statement };
    })
  );

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans text-slate-800">
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-col p-6 bg-white/40 backdrop-blur-xl border-r border-slate-200/60 shadow-xl z-20">
        <div className="mb-10 px-2">
          <h1 className="text-2xl font-black tracking-tighter text-slate-900">BarberMind</h1>
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Smart Engine</p>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition"><span>🏠</span> Visão Geral</Link>
          <Link href="/dashboard/agenda" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition"><span>📅</span> Agenda</Link>
          <Link href="/dashboard/finance" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-sm text-slate-900 font-bold transition border border-slate-100"><span>💰</span> Financeiro (DRE)</Link>
          <Link href="/dashboard/plans" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition"><span>💎</span> Planos & Clube</Link>
          <Link href="/dashboard/new" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition"><span>➕</span> Novo Encaixe</Link>
          <Link href="/dashboard/products" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition"><span>🛒</span> Estoque e Shop</Link>
          <Link href="/dashboard/clients" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition"><span>👥</span> Base de Clientes</Link>
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
        <div className="max-w-6xl mx-auto w-full space-y-10">
          
          {/* HEADER DO DRE */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Inteligência Financeira</h2>
              <p className="text-slate-500 font-medium">Demonstrativo de Resultados do mês atual.</p>
            </div>
            
            <div className={`px-6 py-3 rounded-2xl border shadow-sm flex items-center gap-4 ${profitMargin >= 20 ? 'bg-green-50 border-green-200' : profitMargin >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Margem de Lucro</p>
                  <p className={`text-2xl font-black ${profitMargin >= 20 ? 'text-green-700' : profitMargin >= 0 ? 'text-amber-700' : 'text-red-700'}`}>
                    {profitMargin.toFixed(1)}%
                  </p>
               </div>
               <span className="text-3xl">{profitMargin >= 20 ? '🚀' : profitMargin >= 0 ? '⚖️' : '🚨'}</span>
            </div>
          </header>

          {/* PRIMEIRA LINHA: DRE E DESPESAS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUNA ESQUERDA: O DRE VISUAL */}
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/30 rounded-full blur-3xl"></div>
                  
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Lucro Líquido Real</p>
                  <div className="flex items-baseline gap-2 relative z-10">
                     <h3 className="text-6xl font-black tracking-tighter">{formatMoney(netProfit)}</h3>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faturação Total</p>
                        <p className="font-bold text-green-400">+{formatMoney(grossRevenue)}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Custos Diretos</p>
                        <p className="font-bold text-red-400">-{formatMoney(directCosts)}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Despesas (Fixas/Var)</p>
                        <p className="font-bold text-orange-400">-{formatMoney(totalExpenses)}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contas Pagas</p>
                        <p className="font-bold text-slate-300">{formatMoney(paidExpenses)}</p>
                     </div>
                  </div>
               </div>

               <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8">
                  <h3 className="text-lg font-black text-slate-900 mb-6">Raio-X da Operação</h3>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center p-3 rounded-xl bg-green-50/50 border border-green-100">
                        <span className="font-bold text-slate-700 flex items-center gap-2">✂️ Faturação em Cortes</span>
                        <span className="font-black text-green-700">{formatMoney(totalCutsRevenue)}</span>
                     </div>
                     <div className="flex justify-between items-center p-3 rounded-xl bg-green-50/50 border border-green-100">
                        <span className="font-bold text-slate-700 flex items-center gap-2">🛍️ Faturação do Shop</span>
                        <span className="font-black text-green-700">{formatMoney(totalShopRevenue)}</span>
                     </div>
                     <div className="h-px bg-slate-200 my-4"></div>
                     <div className="flex justify-between items-center p-3 rounded-xl bg-red-50/50 border border-red-100">
                        <span className="font-bold text-slate-700 flex items-center gap-2">🤝 Comissões de Barbeiros</span>
                        <span className="font-black text-red-700">-{formatMoney(totalCommissionsPaid)}</span>
                     </div>
                     <div className="flex justify-between items-center p-3 rounded-xl bg-red-50/50 border border-red-100">
                        <span className="font-bold text-slate-700 flex items-center gap-2">📦 Custo de Produtos Vendidos</span>
                        <span className="font-black text-red-700">-{formatMoney(totalProductsCost)}</span>
                     </div>
                     <div className="h-px bg-slate-200 my-4"></div>
                     <div className="flex justify-between items-center p-4 rounded-xl bg-slate-100 border border-slate-200">
                        <span className="font-black text-slate-900 uppercase tracking-widest text-xs">Lucro Bruto (Margem de Contribuição)</span>
                        <span className="font-black text-slate-900 text-lg">{formatMoney(grossProfit)}</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* COLUNA DIREITA: GESTÃO DE DESPESAS */}
            <div className="lg:col-span-1">
               <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-6 flex flex-col h-full min-h-[600px]">
                  <div className="flex justify-between items-center mb-6 px-2">
                    <div>
                      <h3 className="font-black text-slate-900 text-lg">Contas a Pagar</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aluguel, Tráfego, Luz</p>
                    </div>
                  </div>

                  <form action={addExpense} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 space-y-3">
                     <input type="text" name="title" required placeholder="Nome da conta (Ex: Luz)" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200" />
                     <div className="flex gap-2">
                        <input type="number" step="0.01" name="amount" required placeholder="Valor R$" className="w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200" />
                        <input type="date" name="due_date" required defaultValue={todayStr} className="w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200" />
                     </div>
                     <div className="flex gap-2">
                        <select name="category" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200">
                           <option value="fixo">Custo Fixo</option>
                           <option value="variavel">Custo Variável (Tráfego)</option>
                        </select>
                        <button type="submit" className="bg-slate-900 text-white px-4 rounded-xl font-black hover:bg-slate-800 transition active:scale-95 flex-shrink-0">
                           +
                        </button>
                     </div>
                  </form>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
                     {expenses?.length === 0 ? (
                        <p className="text-center text-sm font-bold text-slate-400 py-10">Nenhuma conta registada este mês.</p>
                     ) : (
                        expenses?.map(exp => (
                           <div key={exp.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${exp.is_paid ? 'bg-slate-100/50 border-transparent opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                              <div className="flex items-center gap-3">
                                 <form action={toggleExpensePayment.bind(null, exp.id, !exp.is_paid)}>
                                    <button type="submit" className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${exp.is_paid ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-indigo-400'}`}>
                                       {exp.is_paid && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                    </button>
                                 </form>
                                 <div>
                                    <p className={`text-sm font-black ${exp.is_paid ? 'line-through text-slate-500' : 'text-slate-800'}`}>{exp.title}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                       Vence: {new Date(exp.due_date + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}
                                    </p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <p className={`font-black ${exp.is_paid ? 'text-slate-500' : 'text-orange-600'}`}>
                                    {formatMoney(exp.amount)}
                                 </p>
                                 <form action={deleteExpense.bind(null, exp.id)}>
                                    <button type="submit" className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                 </form>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
          </div>

          {/* ======================================= */}
          {/* SEGUNDA LINHA: ACERTO DE BARBEIROS        */}
          {/* ======================================= */}
          <div className="mt-12">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-6">Acerto de Comissões (A Pagar)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {barberStatements.map((prof) => {
                const { cortesAvulsosCount, cortesPlanosCount, totalAvulso, totalPlanos, vales, totalVales, valorLiquidoReceber } = prof.statement;
                
                return (
                  <div key={prof.id} className="bg-white/70 backdrop-blur-3xl border border-white shadow-xl shadow-slate-200/40 rounded-[2.5rem] p-6 flex flex-col relative overflow-hidden">
                    {/* Header do Barbeiro */}
                    <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                      <div className="w-14 h-14 rounded-full bg-cover bg-center shadow-md border-2 border-white" style={{ backgroundImage: `url('https://i.pravatar.cc/150?img=${prof.avatar || '11'}')` }}></div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900">{prof.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extrato da Semana</p>
                      </div>
                    </div>

                    {/* Resumo Financeiro */}
                    <div className="space-y-3 flex-1">
                      <div className="flex justify-between items-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <div>
                           <p className="text-xs font-bold text-slate-700">Cortes Avulsos</p>
                           <p className="text-[10px] font-bold text-slate-400">{cortesAvulsosCount} realizados</p>
                        </div>
                        <p className="font-black text-slate-900">{formatMoney(totalAvulso)}</p>
                      </div>

                      <div className="flex justify-between items-center bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                        <div>
                           <p className="text-xs font-bold text-indigo-700 flex items-center gap-1"><span>💎</span> Cortes de Planos</p>
                           <p className="text-[10px] font-bold text-indigo-400">{cortesPlanosCount} realizados (Taxa Fixa)</p>
                        </div>
                        <p className="font-black text-indigo-700">{formatMoney(totalPlanos)}</p>
                      </div>

                      {totalVales > 0 && (
                        <div className="flex justify-between items-center bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                          <div>
                             <p className="text-xs font-bold text-red-700 flex items-center gap-1"><span>📉</span> Vales Retirados</p>
                             <p className="text-[10px] font-bold text-red-400">{vales.length} registros pendentes</p>
                          </div>
                          <p className="font-black text-red-700">-{formatMoney(totalVales)}</p>
                        </div>
                      )}
                    </div>

                    {/* Valor Final a Pagar */}
                    <div className="my-6 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Líquido a Transferir</p>
                      <p className={`text-4xl font-black tracking-tight ${valorLiquidoReceber > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {formatMoney(Math.max(0, valorLiquidoReceber))}
                      </p>
                    </div>

                    {/* Lançar Vale (Accordion Native) */}
                    <details className="group mb-4 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                      <summary className="text-xs font-black text-slate-600 uppercase tracking-widest px-4 py-3 cursor-pointer list-none flex justify-between items-center hover:bg-slate-100 transition-colors">
                        <span>+ Lançar Vale / Adiantamento</span>
                        <span className="group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                      </summary>
                      <form action={addBarberAdvance} className="p-4 border-t border-slate-200 space-y-3 bg-white">
                        <input type="hidden" name="professional_id" value={prof.id} />
                        <input type="number" step="0.01" name="amount" required placeholder="Valor R$ (Ex: 50.00)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200" />
                        <input type="text" name="description" required placeholder="Motivo (Ex: Almoço)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200" />
                        <button type="submit" className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition active:scale-95">Salvar Vale</button>
                      </form>
                    </details>

                    {/* Botão Seguro de Pagar e Fechar Acerto */}
                    {valorLiquidoReceber > 0 || totalVales > 0 ? (
                      <SettleButton actionFn={settleBarberAccount.bind(null, prof.id)} professionalName={prof.name} />
                    ) : (
                      <button disabled className="w-full py-4 bg-slate-100 text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed">
                        Nenhum corte pendente
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}