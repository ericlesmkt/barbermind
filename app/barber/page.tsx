"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { updateProfessionalSchedule } from '@/app/actions/professionals'; // A nossa nova action!

export default function BarberPWA() {
  const supabase = createClient();
  
  // Estados para dados reais do banco
  const [stats, setStats] = useState({ revenue: 0, commission: 0, cuts: 0 });
  const [agenda, setAgenda] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de Salvamento
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // O perfil do barbeiro agora vem do banco
  const [barberProfile, setBarberProfile] = useState({ 
    id: 'leo', 
    name: 'Léo', 
    img: '11', 
    isCommissioned: true 
  });

  // Estado inicial de fallback (será substituído pelo do banco)
  const [schedule, setSchedule] = useState<any>({
    seg: { active: false, shifts: [{ start: '09:00', end: '19:00' }] },
    ter: { active: true, shifts: [{ start: '09:00', end: '19:00' }] },
    qua: { active: true, shifts: [{ start: '09:00', end: '19:00' }] },
    qui: { active: true, shifts: [{ start: '09:00', end: '19:00' }] },
    sex: { active: true, shifts: [{ start: '09:00', end: '20:00' }] },
    sab: { active: true, shifts: [{ start: '08:00', end: '17:00' }] },
    dom: { active: false, shifts: [{ start: '00:00', end: '00:00' }] },
  });

  useEffect(() => {
    async function loadDashboardData() {
      // 1. Busca os dados do perfil e horários gravados no banco
      const { data: profData } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', barberProfile.id)
        .single();

      if (profData) {
        setBarberProfile(prev => ({ 
          ...prev, 
          name: profData.name, 
          isCommissioned: profData.is_commissioned 
        }));
        
        // Se já tiver horário salvo no banco, usa ele
        if (profData.schedule && Object.keys(profData.schedule).length > 0) {
          setSchedule(profData.schedule);
        }
      }

      // 2. Lógica de Data (Timezone Brasil)
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      const startOfDay = new Date(`${todayStr}T00:00:00-03:00`).toISOString();
      const endOfDay = new Date(`${todayStr}T23:59:59.999-03:00`).toISOString();
      
      // 3. Faturamento
      const { data: completedApts } = await supabase
        .from('appointments')
        .select('price')
        .eq('professional_id', barberProfile.id)
        .eq('status', 'completed')
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay);

      const total = completedApts?.reduce((acc, curr) => acc + Number(curr.price), 0) || 0;
      setStats({
        revenue: total,
        commission: total * (profData?.commission_rate || 0.5), 
        cuts: completedApts?.length || 0
      });

      // 4. Agenda do Dia com Shop
      const { data: todayAgenda } = await supabase
        .from('appointments')
        .select('*, clients(id, name, whatsapp)')
        .eq('professional_id', barberProfile.id)
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay)
        .order('scheduled_at', { ascending: true });

      if (todayAgenda && todayAgenda.length > 0) {
        const clientIds = todayAgenda.map(a => a.clients?.id).filter(Boolean);
        let pendingOrders: any[] = [];
        
        if (clientIds.length > 0) {
          const { data: orders } = await supabase
            .from('shop_orders')
            .select('*, order_items(*, products(name))')
            .in('client_id', clientIds)
            .eq('status', 'pending_pickup');
          pendingOrders = orders || [];
        }

        const agendaWithOrders = todayAgenda.map(apt => {
          const clientOrder = pendingOrders.find(o => o.client_id === apt.clients?.id);
          return { ...apt, pendingOrder: clientOrder || null };
        });

        setAgenda(agendaWithOrders);
      } else {
        setAgenda([]);
      }
      setLoading(false);
    }
    loadDashboardData();
  }, [supabase]);

  // Funções de manipulação do Expediente
  const toggleDay = (day: keyof typeof schedule) => {
    setSchedule((prev: any) => ({
      ...prev,
      [day]: { ...prev[day], active: !prev[day].active }
    }));
  };

  const addShift = (day: keyof typeof schedule) => {
    setSchedule((prev: any) => ({
      ...prev,
      [day]: { ...prev[day], shifts: [...prev[day].shifts, { start: '', end: '' }] }
    }));
  };

  const removeShift = (day: keyof typeof schedule, index: number) => {
    setSchedule((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        shifts: prev[day].shifts.filter((_: any, i: number) => i !== index)
      }
    }));
  };

  const updateShift = (day: keyof typeof schedule, index: number, field: 'start' | 'end', value: string) => {
    setSchedule((prev: any) => {
      const newShifts = [...prev[day].shifts];
      newShifts[index][field] = value;
      return {
        ...prev,
        [day]: { ...prev[day], shifts: newShifts }
      };
    });
  };

  // Função que envia o horário para o banco
  const handleSaveSchedule = async () => {
    setIsSaving(true);
    try {
      await updateProfessionalSchedule(barberProfile.id, schedule);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // Oculta o "Salvo!" após 3s
    } catch (error) {
      alert("Erro ao salvar horário. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimeBR = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] font-sans text-slate-800 pb-24">
      
      <div className="max-w-md mx-auto bg-[#f3f4f6] min-h-screen relative shadow-2xl overflow-hidden">
        
        {/* Glows de Fundo */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-500/20 to-transparent -z-10"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-400/30 rounded-full blur-[80px] -z-10"></div>

        {/* HEADER DO APP */}
        <header className="px-6 pt-12 pb-6 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Painel do Parceiro</p>
            <h1 className="text-3xl font-black text-[#1a1d2d] tracking-tight">Fala, {barberProfile.name}!</h1>
          </div>
          <div className="w-14 h-14 rounded-full bg-cover bg-center shadow-lg border-2 border-white" style={{ backgroundImage: `url('https://i.pravatar.cc/150?img=${barberProfile.img}')` }}></div>
        </header>

        {/* RESUMO DO DIA */}
        <div className="px-6 mb-8">
          <div className="bg-white/70 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-6 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">O seu dia hoje</h2>
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            </div>
            
            <div className="flex items-end justify-between">
              {barberProfile.isCommissioned ? (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sua Parte (R$)</p>
                  <p className="text-4xl font-black text-[#1a1d2d]">
                    R$ {loading ? "..." : stats.commission.toFixed(0)}
                  </p>
                </div>
              ) : (
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                   <p className="text-2xl font-black text-indigo-600">Produtivo 🚀</p>
                </div>
              )}
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cortes</p>
                <p className="text-2xl font-black text-slate-800">{loading ? "-" : stats.cuts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* AGENDA DO DIA */}
        <div className="px-6 mb-10">
          <h3 className="text-lg font-black text-slate-900 tracking-tight mb-4">Próximos Clientes</h3>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-20 bg-white/50 border border-white rounded-[1.5rem] animate-pulse"></div>)}
            </div>
          ) : agenda.length === 0 ? (
            <div className="p-6 bg-white/50 border border-slate-200 rounded-[1.5rem] text-center">
              <p className="text-sm font-bold text-slate-500">Nenhum agendamento para hoje.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agenda.map((apt) => {
                const isCompleted = apt.status === 'completed';
                return (
                  <div key={apt.id} className={`p-4 rounded-[1.5rem] border transition-all flex items-center justify-between ${
                    isCompleted ? 'bg-slate-100/50 border-transparent opacity-60' : 'bg-white border-white shadow-sm'
                  }`}>
                    <div>
                      <p className={`text-base font-black ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{apt.clients?.name}</p>
                      <p className="text-xs font-bold text-indigo-600">{apt.service_name}</p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                        <p className="text-sm font-black text-slate-700">{formatTimeBR(apt.scheduled_at)}</p>
                      </div>
                      
                      {apt.pendingOrder && !isCompleted && (
                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-widest">
                          <span>📦</span> Retirada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CONFIGURAÇÃO DE DISPONIBILIDADE */}
        <div className="px-6 space-y-6">
          <div className="flex justify-between items-center">
             <h3 className="text-lg font-black text-slate-900 tracking-tight">Meu Expediente</h3>
             
             {/* BOTÃO DE SALVAR MAGNÍFICO */}
             <button 
                onClick={handleSaveSchedule}
                disabled={isSaving}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm ${
                  saveSuccess 
                  ? 'bg-green-500 text-white shadow-green-200' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                }`}
             >
                {isSaving ? '⏳ Salvando...' : saveSuccess ? '✓ Salvo!' : '💾 Salvar'}
             </button>
          </div>

          <p className="text-xs font-bold text-slate-500 leading-relaxed mb-4">
            Defina seus horários. Você pode adicionar intervalos para almoço ou compromissos.
          </p>

          <div className="space-y-3">
            {[
              { id: 'seg', label: 'Segunda-feira' },
              { id: 'ter', label: 'Terça-feira' },
              { id: 'qua', label: 'Quarta-feira' },
              { id: 'qui', label: 'Quinta-feira' },
              { id: 'sex', label: 'Sexta-feira' },
              { id: 'sab', label: 'Sábado' },
              { id: 'dom', label: 'Domingo' },
            ].map((day) => {
              const d = day.id as keyof typeof schedule;
              const isActive = schedule[d]?.active || false;
              const shifts = schedule[d]?.shifts || [];

              return (
                <div key={day.id} className={`p-5 rounded-[1.5rem] transition-all duration-300 border ${isActive ? 'bg-white border-transparent shadow-sm' : 'bg-slate-200/50 border-slate-300/30'}`}>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-black uppercase tracking-wider ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{day.label}</span>
                    <button onClick={() => toggleDay(d)} className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${isActive ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm transition-transform duration-300 ${isActive ? 'translate-x-6' : 'translate-x-1'}`}></div>
                    </button>
                  </div>

                  {isActive && (
                    <div className="mt-5 pt-5 border-t border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                      {shifts.map((shift: any, index: number) => (
                        <div key={index} className="flex gap-3 items-end relative group">
                          <div className="flex-1">
                            {index === 0 && <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Entrada</label>}
                            <input 
                              type="time" 
                              value={shift.start} 
                              onChange={(e) => updateShift(d, index, 'start', e.target.value)} 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 appearance-none" 
                            />
                          </div>
                          <div className="flex-1">
                            {index === 0 && <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Saída</label>}
                            <input 
                              type="time" 
                              value={shift.end} 
                              onChange={(e) => updateShift(d, index, 'end', e.target.value)} 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 appearance-none" 
                            />
                          </div>
                          
                          {shifts.length > 1 && (
                            <button 
                              onClick={() => removeShift(d, index)}
                              className="h-[38px] w-[38px] flex-shrink-0 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                              title="Remover turno"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      ))}

                      <button 
                        onClick={() => addShift(d)}
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 mt-2 hover:text-indigo-800 transition-colors"
                      >
                        <span>+</span> Adicionar Turno
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200/60 pb-10">
            <h3 className="text-sm font-black text-slate-900 tracking-tight mb-3">Ausência Pontual</h3>
            <p className="text-xs font-bold text-slate-500 mb-4">Vai ao médico ou tirar férias? Bloqueie um dia específico sem mexer no seu expediente padrão.</p>
            <button className="w-full py-4 bg-white border border-slate-200 text-slate-700 font-black rounded-[1.5rem] shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex justify-center items-center gap-2">
              <span>🚫</span> Adicionar Bloqueio
            </button>
          </div>
        </div>

        {/* BOTTOM NAVIGATION */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-3xl border-t border-slate-200/50 pb-safe pt-2 px-6 pb-6 flex justify-between items-center z-50">
           <Link href="#" className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition">
              <span className="text-xl">📅</span>
              <span className="text-[9px] font-black uppercase tracking-widest">Agenda</span>
           </Link>
           <Link href="#" className="flex flex-col items-center gap-1 text-indigo-600 transition">
              <span className="text-xl">⚙️</span>
              <span className="text-[9px] font-black uppercase tracking-widest">Ajustes</span>
           </Link>
           <Link href="#" className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition">
              <span className="text-xl">👤</span>
              <span className="text-[9px] font-black uppercase tracking-widest">Perfil</span>
           </Link>
        </nav>

      </div>
    </div>
  );
}