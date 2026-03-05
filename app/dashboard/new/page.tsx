"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { createAppointment } from '@/app/actions/appointments';

export default function NewAppointmentForm() {
  const supabase = createClient();
  const [selectedUnit, setSelectedUnit] = useState('centro');
  const [selectedProfessional, setSelectedProfessional] = useState('aberto');
  const [selectedService, setSelectedService] = useState('corte');
  const [phone, setPhone] = useState('');
  
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  
  const todayISO = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isGeneratingSlots, setIsGeneratingSlots] = useState(false);

  useEffect(() => {
    async function loadShop() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'venda')
        .gt('stock_quantity', 0);
      if (data) setDbProducts(data);
    }
    loadShop();
  }, [supabase]);

  const toggleProduct = (product: any) => {
    if (selectedProducts.find(p => p.id === product.id)) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    if (value.length > 10) value = `${value.slice(0, 10)}-${value.slice(10)}`;
    
    setPhone(value);
  };

  useEffect(() => {
    setIsGeneratingSlots(true);
    setSelectedTime(''); 

    const timer = setTimeout(() => {
      let baseSlots = ['09:40', '10:20', '11:40', '13:00', '14:20', '15:00', '16:20', '17:00', '18:20'];
      const randomSeed = selectedDate.charCodeAt(selectedDate.length - 1);
      const filteredSlots = baseSlots.filter((_, idx) => (idx + randomSeed) % 3 !== 0);
      setAvailableSlots(filteredSlots);
      setIsGeneratingSlots(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [selectedDate, selectedProfessional]);

  const servicePrice = selectedService === 'corte' ? 70 : selectedService === 'combo' ? 110 : 50;
  const productsTotal = selectedProducts.reduce((acc, p) => acc + p.price, 0);
  const finalTotal = servicePrice + productsTotal;

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 md:p-10 font-sans text-slate-800 flex items-center justify-center">
      <div className="max-w-[1100px] w-full">
        
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 text-sm font-bold text-slate-500 hover:text-slate-800 hover:shadow-md transition-all">
            &larr; Voltar para o Dashboard
          </Link>
        </div>

        <form action={createAppointment} className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
          
          <input type="hidden" name="unit" value={selectedUnit} />
          <input type="hidden" name="professional" value={selectedProfessional} />
          <input type="hidden" name="service" value={selectedService} />
          <input type="hidden" name="time" value={selectedTime} />
          <input type="hidden" name="products" value={JSON.stringify(selectedProducts.map(p => p.id))} />

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-black text-[#1a1d2d] tracking-tight mb-2">Novo Encaixe</h1>
              <p className="text-indigo-500 font-bold text-xs flex items-center gap-2 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Smart Engine Ativa
              </p>
            </div>
            
            <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-max">
              {['centro', 'shopping'].map((unit) => (
                <button 
                  key={unit}
                  type="button"
                  onClick={() => setSelectedUnit(unit)}
                  className={`px-6 py-2.5 rounded-[14px] text-sm transition-all capitalize ${selectedUnit === unit ? 'bg-white text-slate-900 font-black shadow-sm border border-slate-200/50' : 'text-slate-500 font-bold hover:text-slate-800'}`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            <div className="space-y-12">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nome do Cliente</label>
                  <input type="text" name="name" required placeholder="Ex: João Silva" className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 rounded-2xl px-6 py-4 text-slate-800 placeholder-slate-400 font-bold outline-none transition-all shadow-sm" />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">WhatsApp</label>
                    <input type="tel" name="phone" required value={phone} onChange={handlePhoneChange} placeholder="(84) 90000" className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 rounded-2xl px-6 py-4 text-slate-800 placeholder-slate-400 font-bold outline-none transition-all shadow-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Aniversário</label>
                    <input type="date" name="birth_date" className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 rounded-2xl px-6 py-4 text-slate-800 font-bold outline-none transition-all shadow-sm text-center" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Serviço Principal</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'corte', label: '✂️ Corte Social' },
                    { id: 'fade', label: '💈 Degradê / Fade' },
                    { id: 'barba', label: '🧔 Barboterapia' },
                    { id: 'combo', label: '🔥 Combo (C+B)' }
                  ].map((servico) => (
                    <button
                      key={servico.id}
                      type="button"
                      onClick={() => setSelectedService(servico.id)}
                      className={`py-4 px-4 rounded-[1.5rem] text-sm font-bold border transition-all ${
                        selectedService === servico.id 
                        ? 'bg-[#111827] text-white border-[#111827] shadow-lg shadow-slate-900/20' 
                        : 'bg-white text-slate-600 border-slate-200 shadow-sm hover:border-slate-300'
                      }`}
                    >
                      {servico.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ========================================= */}
              {/* SHOP: CARROSSEL COM CORREÇÃO DE BORDAS      */}
              {/* ========================================= */}
              {dbProducts.length > 0 && (
                <div className="space-y-0 animate-in fade-in duration-1000">
                  <div className="flex justify-between items-end px-2 mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Manter o visual em casa</label>
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">Retirada na hora</span>
                  </div>
                  
                  {/* A MÁGICA AQUI: py-6 e px-6 para criar uma zona de segurança e -my-6 -mx-6 para não quebrar o layout da página */}
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide py-6 px-6 -mx-6 -my-6">
                    {dbProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(product)}
                        className={`flex-shrink-0 w-40 p-4 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center relative ${
                          selectedProducts.find(p => p.id === product.id)
                          ? 'border-indigo-500 bg-white shadow-xl scale-105 z-10'
                          : 'border-transparent bg-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-md'
                        }`}
                      >
                        <div className="w-full aspect-square bg-slate-200 rounded-2xl mb-4 flex items-center justify-center text-3xl">🧴</div>
                        <p className="text-[10px] font-black text-slate-900 truncate w-full text-center mb-1">{product.name}</p>
                        <p className="text-sm font-bold text-indigo-600">R$ {product.price.toFixed(0)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-10">
              
              {/* ========================================= */}
              {/* PROFISSIONAIS: COM CORREÇÃO DE BORDAS       */}
              {/* ========================================= */}
              <div className="space-y-0">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Selecione o Profissional</label>
                
                {/* A MÁGICA AQUI: py-8 e px-6 criam a "Bleed Zone" para os anéis (rings) não serem cortados */}
                <div className="flex gap-8 overflow-x-auto scrollbar-hide py-8 px-6 -mx-6 -my-4">
                  {[
                    { id: 'leo', name: 'Leo', img: '11' },
                    { id: 'marcos', name: 'Marcos', img: '12' },
                    { id: 'aberto', name: 'Aberto', img: '0' },
                  ].map((prof) => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => setSelectedProfessional(prof.id)}
                      className={`flex flex-col items-center gap-4 transition-all duration-300 relative ${selectedProfessional === prof.id ? 'transform scale-110 z-10' : 'opacity-60 hover:opacity-100 grayscale hover:grayscale-0'}`}
                    >
                      {/* O anel e o offset agora têm espaço de sobra para renderizar */}
                      <div className={`w-20 h-20 rounded-full bg-cover bg-center shadow-md transition-all duration-300 ${selectedProfessional === prof.id ? 'ring-4 ring-indigo-500 ring-offset-4 border-white' : 'border-4 border-white shadow-sm'}`} 
                           style={prof.img === '0' ? { backgroundColor: '#f1f5f9' } : { backgroundImage: `url('https://i.pravatar.cc/150?img=${prof.img}')`, backgroundSize: 'cover' }}>
                        {prof.img === '0' && <span className="flex items-center justify-center h-full text-3xl text-amber-500">⚡</span>}
                      </div>
                      <span className={`text-xs font-black uppercase tracking-widest ${selectedProfessional === prof.id ? 'text-indigo-600' : 'text-slate-500'}`}>{prof.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-5 mb-6">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Disponibilidade</label>
                  <input 
                    type="date" 
                    name="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                    className="bg-transparent border-none text-slate-900 font-black text-sm outline-none cursor-pointer flex items-center gap-2"
                  />
                </div>

                <div className="min-h-[160px]">
                  {isGeneratingSlots ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="h-[42px] rounded-xl bg-slate-200/50 animate-pulse" style={{ animationDelay: `${i * 75}ms` }}></div>
                      ))}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <span className="text-3xl mb-2">🚫</span>
                      <p className="text-sm font-bold text-slate-600">Agenda Lotada</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {availableSlots.map(time => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`py-2.5 rounded-xl text-sm font-black transition-all shadow-sm ${
                            selectedTime === time 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50 transform scale-105' 
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-14 flex flex-col items-center gap-6">
            <div className="flex gap-8 text-center items-center">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atendimento</p>
                <p className="text-sm font-black text-slate-700">R$ {servicePrice.toFixed(0)}</p>
              </div>
              {productsTotal > 0 && (
                <div className="animate-in fade-in slide-in-from-right-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Produtos</p>
                  <p className="text-sm font-black text-indigo-600">+ R$ {productsTotal.toFixed(0)}</p>
                </div>
              )}
            </div>
            
            <button 
              type="submit" 
              disabled={!selectedTime}
              className={`w-full max-w-md py-5 rounded-[1.8rem] font-black text-lg transition-all flex justify-between px-10 items-center ${
                selectedTime 
                ? 'bg-[#111827] text-white shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-95' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{selectedTime ? 'Confirmar Encaixe' : 'Selecione um Horário'}</span>
              {selectedTime && (
                <span className="bg-white/10 px-4 py-1 rounded-xl border border-white/10 text-base">R$ {finalTotal.toFixed(0)}</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}