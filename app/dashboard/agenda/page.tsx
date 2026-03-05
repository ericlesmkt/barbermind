"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { updateAppointmentStatus, checkoutAppointment } from '../../actions/appointments'; 
import { logout } from '@/app/actions/auth';

export default function SmartAgenda() {
  const supabase = createClient();

  // ==========================================
  // 1. MOTOR DE FUSO HORÁRIO (FORTALEZA)
  // ==========================================
  // Pega a data exata de hoje em Fortaleza no formato YYYY-MM-DD
  const getFortalezaDate = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
  };
  
  const todayISO = getFortalezaDate();
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [activeFilter, setActiveFilter] = useState('Todos');
  
  // Estado para rastrear a hora atual e pintar a linha na agenda
  const [currentHour, setCurrentHour] = useState('');

  // Atualiza a hora atual a cada minuto (para o indicador visual de "Agora")
  useEffect(() => {
    const updateTime = () => {
      const hour = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit' });
      setCurrentHour(hour);
    };
    updateTime(); // Chama na hora que abre a página
    const interval = setInterval(updateTime, 60000); // Atualiza a cada 1 minuto
    return () => clearInterval(interval);
  }, []);

  // 2. ESTADOS DE DADOS E MODAL
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [showWaMenu, setShowWaMenu] = useState(false);
  const [customWaMsg, setCustomWaMsg] = useState('');

  const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  // ==========================================
  // LÓGICA DO CARROSSEL DE DATAS E MESES
  // ==========================================
  const generateDateStrip = (baseDateStr: string) => {
    const dates = [];
    const baseDate = new Date(`${baseDateStr}T12:00:00`); 
    
    for (let i = -3; i <= 3; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(`${selectedDate}T12:00:00`);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const dateStrip = generateDateStrip(selectedDate);
  const isToday = selectedDate === todayISO;
  const displayMonthYear = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // ==========================================
  // BUSCA NO BANCO COM INTELIGÊNCIA DE SHOP
  // ==========================================
  useEffect(() => {
    async function fetchAgenda() {
      setIsLoading(true);
      
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      const { data: aptsData } = await supabase
        .from('appointments')
        .select(`
          id, service_name, scheduled_at, status, price, professional_id,
          clients (id, name, whatsapp, preferences)
        `)
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay)
        .order('scheduled_at', { ascending: true });

      if (aptsData) {
        const clientIds = aptsData.map((a: any) => a.clients?.id).filter(Boolean);
        let pendingOrders: any[] = [];
        
        if (clientIds.length > 0) {
          const { data: orders } = await supabase
            .from('shop_orders')
            .select('*, order_items(*, products(name))')
            .in('client_id', clientIds)
            .eq('status', 'pending_pickup');
          pendingOrders = orders || [];
        }

        const formattedData = aptsData.map((apt: any) => {
          const aptDate = new Date(apt.scheduled_at);
          const localHour = aptDate.getHours().toString().padStart(2, '0');
          const localMinute = aptDate.getMinutes().toString().padStart(2, '0');
          const clientOrder = pendingOrders.find(o => o.client_id === apt.clients?.id);
          
          return {
            id: apt.id,
            time: `${localHour}:${localMinute}`,
            professional: apt.professional_id === 'marcos' ? 'Marcos' : 'Leo', 
            client: apt.clients?.name || 'Cliente Desconhecido',
            whatsapp: apt.clients?.whatsapp || '',
            clientId: apt.clients?.id,
            service: apt.service_name,
            status: apt.status,
            price: Number(apt.price).toFixed(2),
            avatar: apt.clients?.name.charCodeAt(0) % 10 + 10,
            pendingOrder: clientOrder || null
          };
        });
        setAppointments(formattedData);
      }
      setIsLoading(false);
    }

    fetchAgenda();
  }, [selectedDate, supabase]);

  // ==========================================
  // LÓGICA DO WHATSAPP E ATUALIZAÇÃO
  // ==========================================
  const handleSendWhatsApp = (templateMsg?: string) => {
    const msg = templateMsg || customWaMsg;
    if (!msg || !selectedAppointment?.whatsapp) return;
    const phone = selectedAppointment.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setShowWaMenu(false);
  };

  const handleUpdateStatus = async (newStatus: 'completed' | 'no_show' | 'canceled') => {
    if (!selectedAppointment) return;

    const aptId = selectedAppointment.id;
    const clientId = selectedAppointment.clientId;
    
    setAppointments(prev => prev.map(apt => 
      apt.id === aptId ? { ...apt, status: newStatus } : apt
    ));
    
    setSelectedAppointment(null);

    try {
      if (newStatus === 'completed') {
        await checkoutAppointment(aptId, clientId);
      } else {
        await updateAppointmentStatus(aptId, newStatus);
      }
    } catch (error) {
      console.error("Falha ao salvar no banco", error);
    }
  };

  const filteredAppointments = appointments.filter(apt => 
    activeFilter === 'Todos' ? true : apt.professional === activeFilter
  );

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans text-slate-800">
      
      {/* SIDEBAR UNIFICADA */}
      <aside className="hidden md:flex w-64 flex-col p-6 bg-white/40 backdrop-blur-xl border-r border-slate-200/60 shadow-xl z-20">
        <div className="mb-10 px-2">
          <h1 className="text-2xl font-black tracking-tighter text-slate-900">BarberMind</h1>
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Smart Engine</p>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-white hover:text-slate-900 font-bold transition">
            <span>🏠</span> Visão Geral
          </Link>
          <Link href="/dashboard/agenda" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-sm text-slate-900 font-bold transition border border-slate-100">
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

      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative bg-gradient-to-br from-slate-100 via-gray-200 to-zinc-300">
        <div className="max-w-5xl mx-auto">
          
          <header className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Agenda</h1>
                    
                    {/* NAVEGAÇÃO DE MESES */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <button onClick={() => handleMonthChange('prev')} className="p-1 text-slate-400 hover:text-slate-800 transition rounded-md hover:bg-white/50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                      </button>
                      
                      <div className="relative cursor-pointer group flex items-center gap-1 mx-1">
                        <p className="text-sm font-bold text-slate-500 capitalize group-hover:text-indigo-600 transition">{displayMonthYear}</p>
                        <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        
                        <input 
                          type="date" 
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>

                      <button onClick={() => handleMonthChange('next')} className="p-1 text-slate-400 hover:text-slate-800 transition rounded-md hover:bg-white/50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* DATE STRIP */}
                <div className="flex items-center gap-2">
                  {!isToday && (
                    <button 
                      onClick={() => setSelectedDate(todayISO)}
                      className="mr-2 px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition shadow-sm"
                    >
                      Ir para Hoje
                    </button>
                  )}
                  
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 max-w-full">
                    {dateStrip.map((date) => {
                      const dateISO = date.toISOString().split('T')[0];
                      const isSelected = dateISO === selectedDate;
                      const isTodayTag = dateISO === todayISO;
                      
                      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                      const dayNum = date.getDate();

                      return (
                        <button
                          key={dateISO}
                          onClick={() => setSelectedDate(dateISO)}
                          className={`flex flex-col items-center justify-center min-w-[4rem] h-16 rounded-2xl transition-all shadow-sm flex-shrink-0 border 
                            ${isSelected 
                              ? 'bg-slate-900 text-white border-slate-900 scale-105 shadow-md' 
                              : 'bg-white/50 text-slate-500 border-white/80 hover:bg-white hover:text-slate-800'
                            }
                            ${isTodayTag && !isSelected ? 'ring-2 ring-indigo-200' : ''}
                          `}
                        >
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                            {dayName}
                          </span>
                          <span className={`text-lg font-extrabold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                            {dayNum}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Filtros Funcionais */}
              <div className="flex bg-white/40 p-1.5 rounded-2xl border border-white/60 shadow-sm w-full md:w-auto overflow-x-auto scrollbar-hide">
                {['Todos', 'Leo', 'Marcos'].map((prof) => (
                  <button 
                    key={prof} 
                    onClick={() => setActiveFilter(prof)}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeFilter === prof ? 'bg-white text-slate-900 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {prof}
                  </button>
                ))}
              </div>
              
            </div>
          </header>

          {/* CONTAINER DA AGENDA VISUAL */}
          <main className="bg-white/40 backdrop-blur-2xl border border-white/70 shadow-2xl shadow-slate-300/40 rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-20 w-72 h-72 bg-indigo-100/50 rounded-full blur-3xl -z-10"></div>
            
            {isLoading ? (
              <div className="relative mt-4 space-y-2">
                {hours.map((hour) => (
                  <div key={hour} className="flex relative">
                    <div className="w-16 flex-shrink-0 text-right pr-4 py-6 relative">
                      <span className="text-xs font-bold text-slate-400">{hour}</span>
                      <div className="absolute top-9 left-16 w-[calc(100vw-6rem)] md:w-[800px] border-t border-white/50 -z-10"></div>
                    </div>
                    <div className="flex-1 relative min-h-[5rem] py-1">
                      <div className="absolute top-1 left-2 w-[95%] md:w-[80%] h-[calc(100%-8px)] rounded-2xl bg-white/30 backdrop-blur-sm border border-white/50 animate-pulse flex items-center p-4 gap-4">
                         <div className="w-1.5 h-10 rounded-full bg-slate-200/50"></div>
                         <div className="w-10 h-10 rounded-full bg-slate-200/60"></div>
                         <div className="space-y-2 flex-1">
                           <div className="h-3 w-1/3 bg-slate-300/60 rounded-md"></div>
                           <div className="h-2 w-1/4 bg-slate-200/60 rounded-md"></div>
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative mt-4">
                {hours.map((hour) => {
                  const appointment = filteredAppointments.find(a => a.time.startsWith(hour.split(':')[0]));
                  
                  // VERIFICA SE ESTE É O BLOCO DA HORA ATUAL
                  const isCurrentHour = isToday && hour.startsWith(currentHour);

                  return (
                    <div key={hour} className="flex relative group">
                      
                      <div className="w-16 flex-shrink-0 text-right pr-4 py-6 relative">
                        {/* HORA DESTACADA CASO SEJA AGORA */}
                        <span className={`text-xs transition-colors ${isCurrentHour ? 'font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg shadow-sm' : 'font-bold text-slate-400'}`}>
                          {hour}
                        </span>
                        
                        {/* LINHA NORMAL OU LINHA TRACEJADA AZUL (AGORA) */}
                        <div className={`absolute top-9 left-16 w-[calc(100vw-6rem)] md:w-[800px] border-t -z-10 transition-colors ${isCurrentHour ? 'border-indigo-400/60 border-dashed' : 'border-white/50'}`}></div>
                        
                        {/* PONTO PULSANDO SE FOR AGORA */}
                        {isCurrentHour && (
                          <div className="absolute top-[31px] left-[59px] w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse z-10"></div>
                        )}
                      </div>

                      <div className="flex-1 relative min-h-[5rem] py-1">
                        
                        {!appointment && (
                          <Link href={`/dashboard/new?date=${selectedDate}&time=${hour}`} className="absolute top-1 left-2 w-[95%] md:w-[80%] h-[calc(100%-8px)] rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 border border-white/40 hover:bg-white/40 backdrop-blur-sm cursor-pointer z-0">
                            <span className="text-slate-500 font-bold text-sm flex items-center gap-2">
                              <span className="text-lg">+</span> Adicionar Agendamento
                            </span>
                          </Link>
                        )}

                        {appointment && appointment.status !== 'canceled' && (
                          <div 
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowWaMenu(false); 
                            }}
                            className={`absolute top-1 left-2 w-[95%] md:w-[80%] h-[calc(100%-8px)] rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.01] cursor-pointer shadow-sm z-10
                              ${appointment.status === 'completed' ? 'bg-white/30 backdrop-blur-md border border-white/50 opacity-60' : ''}
                              ${appointment.status === 'confirmed' ? 'bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/40' : ''}
                              ${appointment.status === 'no_show' ? 'bg-red-50/60 backdrop-blur-md border border-red-200/50 opacity-80' : ''}
                            `}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-1.5 h-10 rounded-full 
                                ${appointment.status === 'completed' ? 'bg-slate-300' : ''}
                                ${appointment.status === 'confirmed' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : ''}
                                ${appointment.status === 'no_show' ? 'bg-red-400' : ''}
                              `}></div>
                              
                              <div className={`w-10 h-10 rounded-full bg-cover bg-center shadow-md border-2 border-white ${appointment.status === 'completed' ? 'grayscale' : ''}`} style={{ backgroundImage: `url('https://i.pravatar.cc/100?img=${appointment.avatar}')` }}></div>
                              <div>
                                <p className={`text-sm font-bold ${appointment.status === 'no_show' ? 'text-red-900' : 'text-slate-900'} ${appointment.status === 'completed' ? 'line-through decoration-slate-400' : ''}`}>{appointment.client}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-slate-600">{appointment.service}</p>
                                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">{appointment.professional}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right flex flex-col items-end">
                              <p className="text-sm font-extrabold text-slate-900">R$ {appointment.price}</p>
                              {appointment.pendingOrder && appointment.status !== 'completed' && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-1 inline-block flex items-center gap-1">
                                  <span>📦</span> Compras
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>

        {/* MODAL COM AVISO DE SHOP */}
        {selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedAppointment(null)}></div>
            
            <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
              
              <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-cover bg-center border-2 border-white shadow-sm" style={{ backgroundImage: `url('https://i.pravatar.cc/100?img=${selectedAppointment.avatar}')` }}></div>
                <div className="flex-1">
                  <h3 className="text-xl font-extrabold text-slate-900">{selectedAppointment.client}</h3>
                  <p className="text-sm font-medium text-slate-500">{selectedAppointment.service} • {selectedAppointment.time}</p>
                </div>
                <button onClick={() => setSelectedAppointment(null)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 transition">✕</button>
              </div>

              {showWaMenu ? (
                <div className="p-6 bg-emerald-50/50">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider ml-1">Disparo Rápido</p>
                    <button onClick={() => setShowWaMenu(false)} className="text-xs font-bold text-slate-400 hover:text-slate-700">Voltar</button>
                  </div>
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                    {[{ label: '⏰ Lembrete', text: `Olá ${selectedAppointment?.client?.split(' ')[0]}, passando para confirmar seu horário hoje às ${selectedAppointment?.time} com a gente!` }, { label: '🏃 Atraso', text: `Fala ${selectedAppointment?.client?.split(' ')[0]}, tá a caminho? O barbeiro já está te esperando.` }, { label: '🎫 Promo IA', text: `E aí ${selectedAppointment?.client?.split(' ')[0]}! Temos um horário livre agora às ${selectedAppointment?.time}. Quer encaixar com 15% OFF?` }].map((template, idx) => (
                      <button key={idx} onClick={() => handleSendWhatsApp(template.text)} className="whitespace-nowrap px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-100 transition">
                        {template.label}
                      </button>
                    ))}
                  </div>
                  <textarea value={customWaMsg} onChange={(e) => setCustomWaMsg(e.target.value)} placeholder="Ou digite uma mensagem personalizada..." className="w-full h-24 bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-400 rounded-xl p-3 text-sm text-slate-700 outline-none resize-none mb-3 shadow-sm" />
                  <button onClick={() => handleSendWhatsApp()} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition flex justify-center items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.04 2C6.49 2 2 6.49 2 12.04c0 1.76.45 3.44 1.3 4.96L2 22l5.2-1.28c1.46.78 3.08 1.2 4.8 1.2 5.55 0 10.04-4.49 10.04-10.04S17.59 2 12.04 2zM17.5 16.14c-.2.58-1.15 1.1-1.6 1.17-.4.06-.92.1-2.65-.6-2.07-.86-3.4-3-3.52-3.15-.1-.14-.84-1.1-.84-2.1 0-1 .5-1.5.68-1.7.17-.2.37-.2.5-.2.13 0 .27 0 .37.24.12.27.4 1 .44 1.08.03.08.06.18 0 .28-.05.1-.08.16-.16.26-.07.09-.16.2-.22.26-.08.08-.18.17-.07.36.12.2.53.86 1.13 1.4.77.7 1.4 1 1.6 1.12.2.1.32.08.45-.06.13-.15.56-.66.72-.88.16-.22.32-.18.53-.1.22.08 1.4.66 1.63.78.25.1.4.17.47.28.06.1.06.6-.14 1.18z"/></svg>
                    Enviar WhatsApp
                  </button>
                </div>
              ) : (
                <>
                  {selectedAppointment.pendingOrder && selectedAppointment.status !== 'completed' && (
                    <div className="mx-6 mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                      <span className="text-xl">📦</span>
                      <div>
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Entregar Produto</p>
                        {selectedAppointment.pendingOrder.order_items.map((item: any) => (
                          <p key={item.id} className="text-xs font-bold text-amber-900">{item.quantity}x {item.products?.name}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedAppointment.status === 'confirmed' && (
                    <div className="p-6 bg-slate-50/50 mt-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Atualizar Status</p>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleUpdateStatus('completed')} 
                          className="flex-1 py-3 px-4 rounded-xl bg-green-500 text-white font-bold shadow-md shadow-green-500/20 hover:bg-green-600 transition flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          {selectedAppointment.pendingOrder ? 'Finalizar e Receber' : 'Compareceu'}
                        </button>
                        
                        <button 
                          onClick={() => handleUpdateStatus('no_show')} 
                          className="flex-1 py-3 px-4 rounded-xl bg-red-100 text-red-700 font-bold border border-red-200 hover:bg-red-200 transition flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          Faltou (No-show)
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 flex flex-col gap-2">
                    <Link href={`/dashboard/clients/${selectedAppointment.clientId}`} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-100 transition flex items-center gap-3 text-slate-700 font-medium">
                      <span className="text-xl">⚙️</span> Acessar Smart Profile
                    </Link>
                    <button onClick={() => setShowWaMenu(true)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-emerald-50 text-emerald-700 transition flex items-center gap-3 font-bold">
                      <span className="text-xl">💬</span> Disparar mensagem no WhatsApp
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus('canceled')} 
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition flex items-center gap-3 font-medium"
                    >
                      <span className="text-xl">🗑️</span> Cancelar Agendamento
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}