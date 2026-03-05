import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/actions/auth';
import { createPlan, togglePlanStatus } from '@/app/actions/plans';

export default async function PlansManagement() {
  const supabase = await createClient();

  // Busca todos os planos cadastrados
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .order('active', { ascending: false }) // Ativos primeiro
    .order('created_at', { ascending: false });

  // Cálculo rápido: Quantos clientes ativos existem em cada plano (Futuro Dashboard de Assinaturas)
  // Por enquanto, apenas listamos os planos.

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
          <Link href="/dashboard/plans" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-sm text-slate-900 font-bold transition border border-slate-100">
            <span>💎</span> Planos & Clube
          </Link>
          <Link href="/dashboard/products" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition">
            <span>🛒</span> Estoque e Shop
          </Link>
          <Link href="/dashboard/clients" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition">
            <span>👥</span> Base de Clientes
          </Link>
        </nav>
        <div className="mt-auto space-y-4">
          <form action={logout}>
            <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-white hover:text-red-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all active:scale-95 group">
              <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* ========================================= */}
      {/* CONTEÚDO PRINCIPAL                          */}
      {/* ========================================= */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative">
        <div className="absolute top-0 right-20 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl -z-10"></div>
        <div className="max-w-6xl mx-auto w-full">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestão de Planos</h2>
              <p className="text-slate-500 font-medium">Clube de assinaturas e pacotes pré-pagos.</p>
            </div>
            
            <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 px-4 py-3 rounded-2xl shadow-sm">
               <span className="text-2xl block">💡</span>
               <div>
                 <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Dica de Retenção</p>
                 <p className="text-xs font-bold text-indigo-600">Pacotes garantem caixa previsível.</p>
               </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* FORMULÁRIO DE CRIAÇÃO DE PLANO */}
            <div className="lg:col-span-1">
              <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-6 md:p-8">
                <h3 className="text-lg font-black text-slate-900 mb-6">Criar Novo Plano</h3>
                
                <form action={createPlan} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Pacote</label>
                    <input type="text" name="name" required placeholder="Ex: Combo 4 Cortes" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Plano</label>
                    <select name="type" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm">
                      <option value="package">Pacote (Qtd. Fixa)</option>
                      <option value="subscription">Assinatura (Mensal Ilimitado)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Final (R$)</label>
                      <input type="number" step="0.01" name="price" required placeholder="140.00" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qtd Cortes</label>
                      <input type="number" name="cuts_included" placeholder="Ex: 4" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm" />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                      <span>Comissão Fixa Barbeiro</span>
                      <span title="Valor repassado ao barbeiro a cada vez que o cliente sentar na cadeira usando este plano.">ℹ️</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-slate-400 font-bold">R$</span>
                      <input type="number" step="0.01" name="barber_fixed_commission" required placeholder="20.00" className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm" />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 leading-tight">O sistema não cobra comissão % de planos. Defina o valor exato que o barbeiro ganha por corte (DRE).</p>
                  </div>

                  <button type="submit" className="w-full mt-4 py-4 bg-[#1a1d2d] text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-xl hover:bg-slate-800 transition-transform active:scale-95">
                    Adicionar ao Catálogo
                  </button>
                </form>
              </div>
            </div>

            {/* LISTAGEM DE PLANOS ATIVOS E ARQUIVADOS */}
            <div className="lg:col-span-2">
               <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-6 md:p-8 min-h-[600px]">
                  <h3 className="text-lg font-black text-slate-900 mb-6">Planos Cadastrados</h3>

                  {plans?.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                      <span className="text-5xl block mb-4">💎</span>
                      <p className="font-bold text-slate-500">Nenhum plano criado ainda.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {plans?.map((plan) => (
                        <div key={plan.id} className={`p-6 rounded-[2rem] border transition-all relative overflow-hidden group ${plan.active ? 'bg-white border-slate-200 shadow-sm hover:shadow-md' : 'bg-slate-50 border-transparent opacity-60 grayscale'}`}>
                          
                          {/* Botão de Arquivar / Ativar */}
                          <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <form action={togglePlanStatus.bind(null, plan.id, plan.active)}>
                              <button type="submit" className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm transition-colors ${plan.active ? 'bg-white text-red-600 hover:bg-red-50 border-red-100' : 'bg-white text-green-600 hover:bg-green-50 border-green-100'}`}>
                                {plan.active ? 'Arquivar' : 'Reativar'}
                              </button>
                            </form>
                          </div>

                          {!plan.active && (
                            <div className="absolute top-4 left-4">
                               <span className="bg-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Arquivado</span>
                            </div>
                          )}

                          <div className={`mt-${!plan.active ? '6' : '0'}`}>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">
                              {plan.type === 'package' ? 'Pacote Fechado' : 'Assinatura Mensal'}
                            </p>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{plan.name}</h4>
                            <p className="text-3xl font-black text-slate-900 mt-3">R$ {Number(plan.price).toFixed(2)}</p>
                          </div>

                          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                             <div>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Incluso</p>
                               <p className="text-sm font-bold text-slate-700">{plan.cuts_included ? `${plan.cuts_included} Cortes` : 'Ilimitado'}</p>
                             </div>
                             <div>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Repasse (Barbeiro)</p>
                               <p className="text-sm font-bold text-emerald-600">R$ {Number(plan.barber_fixed_commission).toFixed(2)}</p>
                             </div>
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