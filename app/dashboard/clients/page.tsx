"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { logout } from '@/app/actions/auth';

export default function ClientsManagement() {
  const supabase = createClient();

  // ESTADOS DE DADOS
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ESTADOS DE FILTROS E ORDENAÇÃO
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivity, setFilterActivity] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterService, setFilterService] = useState<'all' | 'Corte' | 'Barba' | 'Fade'>('all');
  const [sortBy, setSortBy] = useState<'nameAsc' | 'ltvDesc' | 'recent'>('nameAsc');

  useEffect(() => {
    async function fetchClientsWithStats() {
      setIsLoading(true);
      
      // 1. Busca os clientes e seus agendamentos
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select(`
          id, name, whatsapp, last_visit_date, birth_date, preferences,
          appointments ( price, service_name, status )
        `);

      if (clientsData) {
        // 2. Busca todas as ordens de compra concluídas
        const { data: shopOrders } = await supabase
          .from('shop_orders')
          .select('client_id, total_price')
          .eq('status', 'completed');

        // 3. Processamento e Cruzamento de Dados (LTV Real)
        const processedClients = clientsData.map(client => {
          // LTV de Serviços
          const validAppts = client.appointments?.filter((a: any) => a.status === 'completed' || a.status === 'confirmed') || [];
          const ltvCuts = validAppts.reduce((sum: number, apt: any) => sum + Number(apt.price), 0);
          
          // LTV de Produtos (Busca as compras deste cliente específico)
          const clientOrders = shopOrders?.filter(o => o.client_id === client.id) || [];
          const ltvShop = clientOrders.reduce((sum: number, order: any) => sum + Number(order.total_price), 0);

          const ltvTotal = ltvCuts + ltvShop;

          // Serviços únicos consumidos
          const servicesDone = Array.from(new Set(validAppts.map((a: any) => a.service_name)));

          return {
            ...client,
            ltv: ltvTotal,
            servicesDone,
            totalVisits: validAppts.length,
            hasBoughtProducts: clientOrders.length > 0
          };
        });

        setClients(processedClients);
      }
      setIsLoading(false);
    }
    fetchClientsWithStats();
  }, [supabase]);

  // APLICAÇÃO DOS FILTROS
  let displayedClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         client.whatsapp.includes(searchTerm);
    if (!matchesSearch) return false;
    
    const lastVisit = client.last_visit_date ? new Date(client.last_visit_date) : new Date(0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (filterActivity === 'active' && lastVisit < thirtyDaysAgo) return false;
    if (filterActivity === 'inactive' && lastVisit >= thirtyDaysAgo) return false;

    if (filterService !== 'all') {
      const hasService = client.servicesDone.some((s: string) => s.includes(filterService));
      if (!hasService) return false;
    }
    
    return true;
  });

  // ORDENAÇÃO
  displayedClients.sort((a, b) => {
    if (sortBy === 'ltvDesc') return b.ltv - a.ltv;
    if (sortBy === 'recent') {
      const dateA = a.last_visit_date ? new Date(a.last_visit_date).getTime() : 0;
      const dateB = b.last_visit_date ? new Date(b.last_visit_date).getTime() : 0;
      return dateB - dateA;
    }
    return a.name.localeCompare(b.name);
  });

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
          <Link href="/dashboard/clients" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-sm text-slate-900 font-bold transition border border-slate-100">
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

      {/* ========================================= */}
      {/* CONTEÚDO PRINCIPAL (COM CLIENTES)           */}
      {/* ========================================= */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative">
        <div className="absolute top-0 right-20 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl -z-10"></div>
        
        <div className="max-w-6xl mx-auto">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestão de Base</h2>
              <p className="text-slate-500 font-medium">Encontre oportunidades de upsell e retenção.</p>
            </div>
            <Link href="/dashboard/new" className="py-3 px-6 rounded-2xl bg-slate-900 text-white font-bold shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition active:scale-95 flex items-center gap-2">
              <span className="text-lg">+</span> Novo Cliente
            </Link>
          </header>

          {/* PAINEL DE FILTROS AVANÇADOS */}
          <section className="bg-white/40 backdrop-blur-2xl border border-white/70 shadow-xl shadow-slate-300/30 rounded-[2rem] p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-3.5 opacity-40">🔍</span>
                <input 
                  type="text" 
                  placeholder="Buscar nome ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/60 border border-white/80 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-4 focus:ring-indigo-500/10 transition font-bold text-slate-700 shadow-sm"
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="bg-white/50 border border-white/80 rounded-2xl p-1 shadow-sm flex items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">Ordenar:</span>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer pr-4"
                  >
                    <option value="nameAsc">A - Z</option>
                    <option value="ltvDesc">Maior LTV (Top Clientes)</option>
                    <option value="recent">Mais Recentes</option>
                  </select>
                </div>

                <div className="bg-white/50 border border-white/80 rounded-2xl p-1 shadow-sm flex items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">Serviço:</span>
                  <select 
                    value={filterService} 
                    onChange={(e) => setFilterService(e.target.value as any)}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer pr-4"
                  >
                    <option value="all">Todos</option>
                    <option value="Corte">Cortaram Cabelo</option>
                    <option value="Barba">Fizeram Barba</option>
                    <option value="Fade">Degradê / Fade</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/50 flex flex-wrap gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 mr-2">Status:</span>
              {['all', 'active', 'inactive'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterActivity(f as any)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all capitalize shadow-sm border
                    ${filterActivity === f 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-white/60 text-slate-500 border-white hover:bg-white hover:text-slate-800'}`}
                >
                  {f === 'all' ? 'Todos os Clientes' : f === 'active' ? 'Ativos (30 dias)' : 'Risco de Churn (Inativos)'}
                </button>
              ))}
            </div>
          </section>

          {/* LISTAGEM DE CLIENTES PRO */}
          <section className="space-y-4 pb-12">
            {isLoading ? (
              <div className="flex justify-center p-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : displayedClients.length === 0 ? (
              <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-[2rem] p-10 text-center shadow-sm">
                <p className="text-slate-500 font-bold">Nenhum cliente encontrado com esses filtros.</p>
              </div>
            ) : displayedClients.map((client) => {
              
              const bDate = client.birth_date ? new Date(client.birth_date + 'T12:00:00') : null;
              const isBirthdayMonth = bDate && bDate.getMonth() === new Date().getMonth();
              
              // Lógica de inatividade
              const lastVisit = client.last_visit_date ? new Date(client.last_visit_date) : new Date(0);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              const isInactive = lastVisit < thirtyDaysAgo && client.last_visit_date !== null;

              return (
                <div 
                  key={client.id}
                  className="bg-white/40 backdrop-blur-md border border-white/70 shadow-sm rounded-[1.5rem] p-5 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:bg-white/60 hover:shadow-md group"
                >
                  {/* Avatar e Infos Básicas */}
                  <div className="flex items-center gap-4 w-full md:w-auto md:min-w-[250px]">
                    <div className="w-14 h-14 rounded-full bg-slate-200 border-2 border-white shadow-md flex-shrink-0 relative overflow-hidden">
                      <img src={`https://i.pravatar.cc/150?u=${client.id}`} alt={client.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-lg leading-tight flex items-center gap-2">
                        {client.name}
                      </h4>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">{client.whatsapp}</p>
                      
                      {/* Tags de IA embutidas na lista */}
                      <div className="flex gap-1.5 mt-2">
                        {isBirthdayMonth && <span className="bg-pink-100 text-pink-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-pink-200">🎂 Aniversário</span>}
                        {client.ltv >= 500 && <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-amber-200">👑 VIP</span>}
                        {isInactive && <span className="bg-red-100 text-red-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-red-200">⚠️ Churn</span>}
                        {client.hasBoughtProducts && <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-emerald-200">🛍️ Comprador</span>}
                      </div>
                    </div>
                  </div>

                  {/* Métricas Financeiras (LTV) */}
                  <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-center flex-1 bg-white/30 p-3 rounded-2xl border border-white/50">
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LTV Total</p>
                      <p className="text-sm font-black text-indigo-700">R$ {client.ltv.toFixed(0)}</p>
                    </div>
                    <div className="w-px h-8 bg-white/60"></div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Visitas</p>
                      <p className="text-sm font-black text-slate-700">{client.totalVisits}</p>
                    </div>
                    <div className="w-px h-8 bg-white/60"></div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Última</p>
                      <p className="text-sm font-bold text-slate-700">
                        {client.last_visit_date ? new Date(client.last_visit_date).toLocaleDateString('pt-BR', {day: '2-digit', month:'2-digit'}) : '---'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Ação */}
                  <div className="w-full md:w-auto text-right">
                    <Link 
                      href={`/dashboard/clients/${client.id}`}
                      className="inline-block w-full md:w-auto py-3 px-6 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm shadow-sm hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95 text-center"
                    >
                      Ver Perfil
                    </Link>
                  </div>
                </div>
              );
            })}
          </section>

        </div>
      </main>
    </div>
  );
}