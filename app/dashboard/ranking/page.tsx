"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { logout } from '@/app/actions/auth';

export default function TeamRanking() {
  const supabase = createClient();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showValues, setShowValues] = useState(false);

  useEffect(() => {
    async function fetchRanking() {
      // 1. Timezone Engine para o Mês Atual no Brasil
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      const year = todayStr.split('-')[0];
      const month = todayStr.split('-')[1];
      const startOfMonth = new Date(`${year}-${month}-01T00:00:00-03:00`).toISOString();

      // 2. Busca todos os profissionais ativos dinamicamente
      const { data: profs } = await supabase
        .from('professionals')
        .select('id, name')
        .eq('active', true);

      // 3. Busca Cortes do Mês
      const { data: appointments } = await supabase
        .from('appointments')
        .select('professional_id, price, client_id, scheduled_at')
        .in('status', ['confirmed', 'completed'])
        .gte('scheduled_at', startOfMonth);

      // 4. Busca Vendas do Shop do Mês (Para atribuir ao barbeiro)
      const { data: shopOrders } = await supabase
        .from('shop_orders')
        .select('client_id, total_price, created_at, order_items(quantity)')
        .in('status', ['completed', 'pending_pickup'])
        .gte('created_at', startOfMonth);

      // 5. Motor de Cruzamento de Dados
      const rankingMap: Record<string, any> = {};

      profs?.forEach(p => {
        rankingMap[p.id] = {
          id: p.id,
          name: p.name,
          cuts: 0,
          cutRevenue: 0,
          productsSold: 0,
          productRevenue: 0,
          total: 0,
          img: p.id === 'leo' ? '11' : (p.id === 'marcos' ? '12' : '0') 
        };
      });

      appointments?.forEach(apt => {
        const profId = apt.professional_id;
        if (rankingMap[profId]) {
          rankingMap[profId].cuts += 1;
          rankingMap[profId].cutRevenue += Number(apt.price);
          rankingMap[profId].total += Number(apt.price);
        }
      });

      shopOrders?.forEach(order => {
        const orderDate = order.created_at.split('T')[0];
        const relatedApt = appointments?.find(a => 
          a.client_id === order.client_id && 
          a.scheduled_at.split('T')[0] === orderDate
        );

        const itemsCount = order.order_items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 1;

        if (relatedApt && rankingMap[relatedApt.professional_id]) {
          const profId = relatedApt.professional_id;
          rankingMap[profId].productsSold += itemsCount;
          rankingMap[profId].productRevenue += Number(order.total_price);
          rankingMap[profId].total += Number(order.total_price);
        }
      });

      const board = Object.values(rankingMap)
        .sort((a: any, b: any) => b.total - a.total);

      setLeaderboard(board);
      setIsLoading(false);
    }
    fetchRanking();
  }, [supabase]);

  const tiers = [
    { border: 'border-amber-400', bgOuter: 'bg-[#121826]', shadow: 'shadow-[0_0_40px_rgba(251,191,36,0.2)]', text: 'text-amber-400', badge: 'bg-amber-500 text-amber-950', rank: 'MVP / Ouro' },
    { border: 'border-slate-400', bgOuter: 'bg-[#121826]', shadow: 'shadow-[0_0_30px_rgba(203,213,225,0.1)]', text: 'text-slate-300', badge: 'bg-slate-300 text-slate-800', rank: 'Prata' },
    { border: 'border-orange-700', bgOuter: 'bg-[#121826]', shadow: 'shadow-[0_0_20px_rgba(194,65,12,0.1)]', text: 'text-orange-500', badge: 'bg-orange-600 text-white', rank: 'Bronze' },
    { border: 'border-slate-800', bgOuter: 'bg-[#121826]', shadow: 'shadow-[0_0_10px_rgba(0,0,0,0.1)]', text: 'text-slate-500', badge: 'bg-slate-800 text-slate-300', rank: 'Membro' },
  ];

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans text-slate-800">
      
      {/* ========================================= */}
      {/* SIDEBAR UNIFICADA                           */}
      {/* ========================================= */}
      <aside className="hidden md:flex w-64 flex-col p-6 bg-white/40 backdrop-blur-xl border-r border-slate-200/60 shadow-xl z-20">
        <div className="mb-10 px-2">
          <h1 className="text-2xl font-black tracking-tighter text-slate-900">BarberMind</h1>
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Smart Engine</p>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition">
            <span>🏠</span> Visão Geral
          </Link>
          <Link href="/dashboard/agenda" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition">
            <span>📅</span> Agenda
          </Link>
          <Link href="/dashboard/finance" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition">
            <span>💰</span> Financeiro (DRE)
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
             <Link href="/dashboard/ranking" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-sm text-amber-600 font-black transition border border-amber-100 group">
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

      {/* ========================================= */}
      {/* CONTEÚDO PRINCIPAL: PLACAR MENSAL           */}
      {/* ========================================= */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative">
        <div className="absolute top-0 right-20 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl -z-10"></div>
        <div className="max-w-6xl mx-auto w-full">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Placar Mensal</h2>
              <p className="text-slate-500 font-medium">Desempenho da equipa em Serviços e Produtos.</p>
            </div>
            
            <span className="px-5 py-3 bg-[#1a1d2d] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/20 flex items-center gap-2">
              🤝 Painel de Contribuição
            </span>
          </header>

          <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 md:p-14 relative overflow-hidden">
            
            <div className="text-center mb-16 relative z-10 flex flex-col items-center">
              <h1 className="text-4xl md:text-5xl font-black text-[#1a1d2d] tracking-tight mb-3 uppercase italic">Resultado Mensal</h1>
              <p className="text-slate-500 font-bold text-xs md:text-sm tracking-[0.2em] uppercase">Nossa contribuição no mês</p>
              
              <button 
                onClick={() => setShowValues(!showValues)}
                className="mt-8 flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold transition-colors border border-slate-200 shadow-sm"
              >
                {showValues ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Ocultar Valores
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    Mostrar Valores
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-8 md:gap-14 perspective-1000">
              {isLoading ? (
                 <div className="flex flex-wrap justify-center gap-14">
                   {[1, 2, 3].map(i => (
                     <div key={i} className="w-72 aspect-[2/3] rounded-[2rem] bg-slate-200/50 animate-pulse border-4 border-white"></div>
                   ))}
                 </div>
              ) : leaderboard.length === 0 ? (
                 <div className="text-center py-10">
                   <p className="text-slate-400 font-bold">Nenhum dado registado neste mês ainda.</p>
                 </div>
              ) : (
                leaderboard.map((prof, index) => {
                  const tier = tiers[index] || tiers[3];

                  return (
                    <div 
                      key={prof.id} 
                      className={`relative w-72 aspect-[2/3] rounded-[2rem] overflow-hidden ${tier.bgOuter} border-[4px] ${tier.border} ${tier.shadow} group transform transition-all duration-500 hover:-translate-y-4 hover:scale-105 flex flex-col`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 transform -translate-x-full group-hover:translate-x-full z-20 pointer-events-none"></div>

                      <div className="absolute top-4 left-4 z-20">
                        <div className={`px-4 py-1.5 ${tier.badge} text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg`}>
                          {tier.rank}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col items-center justify-center pt-8 relative z-10">
                        <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-b from-white/20 to-transparent mb-6 shadow-2xl">
                           <div className="w-full h-full rounded-full bg-cover bg-center border-[4px] border-[#121826]" style={{ backgroundImage: `url('https://i.pravatar.cc/150?img=${prof.img}')` }}></div>
                        </div>
                        <h3 className={`text-3xl font-black uppercase tracking-widest ${tier.text} drop-shadow-md`}>
                          {prof.name}
                        </h3>
                      </div>

                      <div className="bg-[#1e293b]/50 p-6 relative z-10 flex flex-col gap-4 border-t border-white/5">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Realizado</span>
                            <span className={`text-xl font-black ${tier.text} tracking-tight`}>
                              {showValues ? `R$ ${prof.total.toFixed(0)}` : 'R$ •••••'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#0f172a] rounded-full overflow-hidden">
                            <div className={`h-full ${tier.badge} w-[85%] rounded-full`}></div>
                          </div>
                        </div>

                        <div className="flex justify-between items-end pt-2 border-t border-white/5">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produção</span>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-white flex items-center gap-1">
                              ✂️ {showValues ? `${prof.cuts} Cortes` : '••'}
                            </span>
                            {prof.productsSold > 0 && (
                              <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 mt-0.5 animate-in fade-in">
                                🧴 {showValues ? `+ ${prof.productsSold} Produtos` : '••'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}