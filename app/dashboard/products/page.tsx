"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { addStockIntake, createNewProduct } from '@/app/actions/products';
import { logout } from '@/app/actions/auth';

export default function InventoryPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal de Abastecimento
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [intakeQty, setIntakeQty] = useState(1);
  const [newCost, setNewCost] = useState(0);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  // Estados do Modal de Novo Produto
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCategory, setNewCategory] = useState('venda');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      
      if (data) setProducts(data);
      setLoading(false);
    }
    fetchProducts();
  }, [supabase]);

  // ==========================================
  // FUNÇÕES DE ABASTECIMENTO 
  // ==========================================
  const handleOpenIntake = (product: any) => {
    setSelectedProduct(product);
    setNewCost(product.cost_price);
    setShowIntakeModal(true);
  };

  const handleConfirmIntake = async () => {
    setIsSubmittingIntake(true);
    try {
      await addStockIntake(selectedProduct.id, intakeQty, newCost);
      setProducts(prev => prev.map(p => 
        p.id === selectedProduct.id 
        ? { ...p, stock_quantity: p.stock_quantity + intakeQty, cost_price: newCost } 
        : p
      ));
      setShowIntakeModal(false);
      setIntakeQty(1);
    } catch (err) {
      alert("Erro ao atualizar estoque.");
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  // ==========================================
  // FUNÇÕES DE CRIAÇÃO DE NOVO PRODUTO
  // ==========================================
  const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingNew(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const newProd = await createNewProduct(formData);
      if (newProd) {
        setProducts(prev => [...prev, newProd].sort((a, b) => a.name.localeCompare(b.name)));
        setShowNewModal(false);
      }
    } catch (err) {
      alert("Erro ao cadastrar produto. Verifique os dados.");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Cálculos de métricas
  const totalStockValue = products.reduce((acc, p) => acc + (p.price * p.stock_quantity), 0);
  const lowStockItems = products.filter(p => p.stock_quantity <= p.min_stock_alert).length;

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
          <Link href="/dashboard/products" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-sm text-slate-900 font-bold transition border border-slate-100">
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

      {/* ========================================= */}
      {/* CONTEÚDO PRINCIPAL DO ESTOQUE               */}
      {/* ========================================= */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative">
        <div className="absolute top-0 right-20 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl -z-10"></div>
        <div className="max-w-6xl mx-auto">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Inventário Inteligente</h2>
              <p className="text-slate-500 font-medium">Controle de entradas, saídas e custos reais.</p>
            </div>
            
            <button 
              onClick={() => setShowNewModal(true)}
              className="bg-[#111827] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
            >
              <span>+</span> Novo Produto
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white/70 backdrop-blur-3xl border border-white p-6 rounded-[2rem] shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Previsão de Venda Total</p>
              <p className="text-3xl font-black text-slate-900">R$ {totalStockValue.toFixed(2)}</p>
            </div>
            <div className="bg-white/70 backdrop-blur-3xl border border-white p-6 rounded-[2rem] shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Itens em Alerta</p>
              <p className={`text-3xl font-black ${lowStockItems > 0 ? 'text-red-500' : 'text-green-500'}`}>{lowStockItems}</p>
            </div>
            <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-xl text-white">
              <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-2">Status do Mês</p>
              <p className="text-3xl font-black">Estoque Ok</p>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-xl rounded-[2.5rem] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Venda</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo Unit.</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estoque</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center font-bold text-slate-400">Nenhum produto cadastrado ainda.</td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="font-black text-slate-900">{p.name}</p>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${p.category === 'venda' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                          {p.category === 'venda' ? 'Vitrine' : 'Insumo'}
                        </span>
                      </td>
                      <td className="px-8 py-6 font-bold text-slate-700">{p.category === 'venda' ? `R$ ${Number(p.price).toFixed(2)}` : '---'}</td>
                      <td className="px-8 py-6 font-bold text-slate-400 italic">R$ {Number(p.cost_price).toFixed(2)}</td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col items-center">
                          <p className={`font-black text-lg ${p.stock_quantity <= p.min_stock_alert ? 'text-red-500' : 'text-slate-900'}`}>
                            {p.stock_quantity}
                          </p>
                          {p.stock_quantity <= p.min_stock_alert && <span className="text-[8px] font-black uppercase text-red-400 tracking-tighter">Baixo</span>}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleOpenIntake(p)}
                          className="bg-indigo-50 text-indigo-600 p-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                          title="Abastecer Estoque"
                        >
                          📦
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ========================================= */}
      {/* MODAL 1: ABASTECIMENTO                      */}
      {/* ========================================= */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowIntakeModal(false)}></div>
          <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[2.5rem] shadow-2xl w-full max-w-sm relative z-10 p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2">
              Abastecer <span>{selectedProduct?.name}</span>
            </h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">Entrada de Mercadoria</p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade que chegou</label>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <button onClick={() => setIntakeQty(Math.max(1, intakeQty - 1))} className="w-10 h-10 bg-white rounded-xl shadow-sm font-black text-xl">-</button>
                  <input type="number" value={intakeQty} onChange={(e) => setIntakeQty(parseInt(e.target.value))} className="flex-1 bg-transparent text-center font-black text-xl outline-none" />
                  <button onClick={() => setIntakeQty(intakeQty + 1)} className="w-10 h-10 bg-white rounded-xl shadow-sm font-black text-xl">+</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Novo Preço de Custo (Opcional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 font-bold text-slate-400">R$</span>
                  <input type="number" step="0.01" value={newCost} onChange={(e) => setNewCost(parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition" />
                </div>
              </div>

              <button 
                onClick={handleConfirmIntake}
                disabled={isSubmittingIntake}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex justify-center items-center gap-2"
              >
                {isSubmittingIntake ? 'Salvando...' : 'Confirmar Abastecimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 2: NOVO PRODUTO DO ZERO             */}
      {/* ========================================= */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowNewModal(false)}></div>
          <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[2.5rem] shadow-2xl w-full max-w-lg relative z-10 p-8 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Novo Produto</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cadastro no Catálogo</p>
              </div>
              <button onClick={() => setShowNewModal(false)} className="w-8 h-8 bg-slate-100 text-slate-500 rounded-full font-bold hover:bg-slate-200 transition">✕</button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Produto/Insumo</label>
                <input type="text" name="name" required placeholder="Ex: Lâminas Derby" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 transition" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria de Uso</label>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button type="button" onClick={() => setNewCategory('venda')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${newCategory === 'venda' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>🛍️ Vitrine (Shop)</button>
                  <button type="button" onClick={() => setNewCategory('uso_interno')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${newCategory === 'uso_interno' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>✂️ Uso Interno</button>
                </div>
                <input type="hidden" name="category" value={newCategory} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`space-y-2 transition-opacity ${newCategory === 'uso_interno' ? 'opacity-30 pointer-events-none' : ''}`}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Venda (R$)</label>
                  <input type="number" step="0.01" name="price" placeholder="0.00" disabled={newCategory === 'uso_interno'} required={newCategory === 'venda'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 transition" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Custo (R$)</label>
                  <input type="number" step="0.01" name="cost_price" placeholder="0.00" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 transition" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estoque Inicial</label>
                  <input type="number" name="stock_quantity" defaultValue="0" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 transition" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">Alerta de Baixa</label>
                  <input type="number" name="min_stock_alert" defaultValue="5" required className="w-full bg-amber-50 border border-amber-200 rounded-2xl py-3 px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-300 transition" />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmittingNew}
                className="w-full mt-4 py-4 bg-[#111827] text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex justify-center items-center gap-2"
              >
                {isSubmittingNew ? 'Criando...' : 'Adicionar ao Catálogo'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}