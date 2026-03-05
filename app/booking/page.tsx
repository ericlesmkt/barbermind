"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { submitBooking, addUpsell, checkClientByPhone, getAvailableSlots } from '@/app/actions/booking';

// SERVIÇOS AGORA COM MINUTOS REAIS PARA BLOQUEAR A AGENDA
const SERVICES = [
  { id: 'corte', name: 'Corte Social / Fade', price: 45, durationText: '45 min', durationMinutes: 45, icon: '✂️' },
  { id: 'barba', name: 'Barboterapia', price: 35, durationText: '30 min', durationMinutes: 30, icon: '🧔' },
  { id: 'combo', name: 'Corte + Barba', price: 75, durationText: '1h 15m', durationMinutes: 75, icon: '🔥' }
];

export default function BookingPWA() {
  const supabase = createClient();

  const [professionals, setProfessionals] = useState<any[]>([]);
  const [upsellProduct, setUpsellProduct] = useState<any>(null);

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [needsName, setNeedsName] = useState(false); 
  const [smartProfile, setSmartProfile] = useState<any>(null);

  const [service, setService] = useState<any>(null);
  const [professional, setProfessional] = useState<any>(null);
  
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  
  const [isScheduling, setIsScheduling] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [upsellStatus, setUpsellStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    async function fetchData() {
      const { data: profs } = await supabase.from('professionals').select('*').eq('active', true);
      if (profs) setProfessionals([...profs, { id: 'any', name: 'Qualquer um', avatar: '0', role: 'Primeiro disponível' }]);

      const { data: prod } = await supabase.from('products').select('*').eq('category', 'venda').gt('stock_quantity', 0).limit(1).single();
      if (prod) setUpsellProduct(prod);
    }
    fetchData();
  }, [supabase]);

  const generateDays = () => {
    const days = [];
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
    const [y, m, d] = todayStr.split('-').map(Number);
    
    // Gera os próximos 5 dias baseado no fuso correto
    for (let i = 0; i < 5; i++) {
      const iterDate = new Date(y, m - 1, d + i);
      days.push(iterDate);
    }
    return days;
  };
  const availableDays = generateDays();

  // Busca os horários livres enviando a duração em minutos!
  useEffect(() => {
    if (date && professional && service) {
      async function fetchTimes() {
        setIsLoadingTimes(true);
        setTime(''); 
        try {
          const slots = await getAvailableSlots(date, professional.id, service.durationMinutes);
          setAvailableTimes(slots);
        } catch (error) {
          setAvailableTimes([]);
        } finally {
          setIsLoadingTimes(false);
        }
      }
      fetchTimes();
    }
  }, [date, professional, service]);

  const formatVisualDate = (isoDate: string) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleIdentify = async () => {
    if (!phone || phone.length < 8) return;
    setIsCheckingPhone(true);
    try {
      const result = await checkClientByPhone(phone);
      if (result.found && result.client) {
        setName(result.client.name);
        setSmartProfile(result.client); // Aqui vem a Carteira (activeSubscription) junto!
        setStep(2); 
      } else {
        setNeedsName(true); 
      }
    } catch (err) {
      setNeedsName(true);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleContinueAsNew = () => {
    if (name.trim().length > 2) setStep(2);
  };

  const handleConfirmBooking = async () => {
    setIsScheduling(true);
    try {
      const result = await submitBooking({
        name, 
        phone, 
        serviceName: service.name, 
        price: service.price, 
        professionalId: professional.id, 
        date, 
        time,
        subscriptionId: smartProfile?.activeSubscription?.id // ENVIANDO O ID DO PLANO
      });
      if (result.success) {
        setCreatedClientId(result.clientId);
        setStep(5);
      }
    } catch (err) {
      alert("Houve um erro ao agendar. Tente novamente.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleAcceptUpsell = async () => {
    if (!createdClientId || !upsellProduct) return;
    setUpsellStatus('loading');
    try {
      await addUpsell(createdClientId, upsellProduct.id, upsellProduct.price);
      setUpsellStatus('success');
    } catch (err) {
      alert("Erro ao adicionar produto.");
      setUpsellStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col md:items-center md:justify-center p-0 md:p-6 font-sans text-slate-800">
      <div className="w-full md:max-w-md min-h-screen md:min-h-[800px] bg-white/70 backdrop-blur-3xl border md:border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:rounded-[2.5rem] overflow-hidden flex flex-col relative z-10">
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-100/40 rounded-full blur-3xl pointer-events-none -z-10"></div>

        <header className="px-6 pt-10 pb-4 relative z-10 flex items-center justify-between">
          {step > 1 && step < 5 ? (
            <button onClick={() => setStep(step - 1)} className="w-10 h-10 flex items-center justify-center bg-white/50 border border-white rounded-full shadow-sm hover:bg-white transition text-slate-500 font-bold">
              &larr;
            </button>
          ) : (
            <div className="w-10"></div>
          )}
          
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">BarberMind</p>
            {step < 5 && (
              <div className="flex gap-1.5 justify-center">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-indigo-600' : s < step ? 'w-2 bg-indigo-300' : 'w-2 bg-slate-200'}`}></div>
                ))}
              </div>
            )}
          </div>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pb-24 pt-4 relative z-10 scrollbar-hide flex flex-col">
          
          {/* ======================================= */}
          {/* PASSO 1: IDENTIFICAÇÃO                    */}
          {/* ======================================= */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1 flex flex-col justify-center pb-20">
              <div className="w-20 h-20 bg-[#1a1d2d] rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-xl shadow-slate-900/20 transform -rotate-6">
                <span className="text-4xl text-white block transform rotate-6">💈</span>
              </div>
              
              <h2 className="text-3xl font-black tracking-tight text-slate-900 text-center mb-2">Bem-vindo!</h2>
              <p className="text-sm font-medium text-slate-500 text-center mb-10">Vamos agendar o seu momento.</p>
              
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu WhatsApp</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(85) 99999-9999" 
                      disabled={needsName}
                      className="w-full bg-white/80 border border-white rounded-2xl py-4 px-5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm transition disabled:opacity-60"
                    />
                 </div>
                 
                 {!needsName ? (
                   <button 
                     onClick={handleIdentify}
                     disabled={!phone || isCheckingPhone}
                     className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50"
                   >
                     {isCheckingPhone ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Começar ➔'}
                   </button>
                 ) : (
                   <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Como quer ser chamado?</label>
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Seu nome ou apelido" 
                          className="w-full bg-white/80 border border-white rounded-2xl py-4 px-5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm transition"
                        />
                      </div>
                      <button 
                        onClick={handleContinueAsNew}
                        disabled={!name}
                        className="w-full py-4 rounded-2xl bg-[#1a1d2d] text-white font-black text-lg shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                      >
                        Continuar
                      </button>
                   </div>
                 )}
              </div>

              <div className="mt-8 bg-blue-50/80 border border-blue-100 rounded-2xl p-4 flex gap-3 text-left">
                <span className="text-blue-500 text-xl">🤖</span>
                <p className="text-xs font-medium text-blue-800 leading-relaxed">
                  Utilize um número válido. Nosso sistema enviará a confirmação do agendamento automaticamente para o seu WhatsApp.
                </p>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* PASSO 2: SERVIÇO COM CLUBE DE ASSINATURA  */}
          {/* ======================================= */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
                {smartProfile ? `O que faremos hoje, ${name.split(' ')[0]}?` : 'O que vamos fazer hoje?'}
              </h2>
              <p className="text-sm font-medium text-slate-500 mb-6">Escolha o serviço desejado.</p>

              {/* AVISO DO CLUBE DE ASSINATURA */}
              {smartProfile?.activeSubscription && (
                <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
                  <span className="text-2xl">💎</span>
                  <div>
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Seu plano está ativo</p>
                    <p className="text-xs font-bold text-emerald-900 mt-0.5">
                      {smartProfile.activeSubscription.plans.name} 
                      {smartProfile.activeSubscription.plans.type === 'package' && ` (${smartProfile.activeSubscription.remaining_cuts} cortes restantes)`}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {SERVICES.map(srv => {
                  const isRecorrent = smartProfile?.lastAppointment?.service_name === srv.name;
                  const hasPlan = !!smartProfile?.activeSubscription;

                  return (
                    <button 
                      key={srv.id}
                      onClick={() => { setService(srv); setStep(3); }}
                      className={`w-full bg-white/80 border shadow-sm hover:shadow-md hover:bg-white rounded-[1.5rem] p-5 flex flex-col text-left transition-all active:scale-95 group relative overflow-hidden ${isRecorrent ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-white'}`}
                    >
                      {isRecorrent && !hasPlan && (
                        <div className="absolute top-0 right-0 bg-indigo-50 border-b border-l border-indigo-100 px-3 py-1 rounded-bl-xl">
                           <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">✨ O de sempre</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4 mt-1">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform ${isRecorrent ? 'bg-indigo-100/50' : 'bg-slate-50'}`}>
                            {srv.icon}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">{srv.name}</h4>
                            <p className="text-xs font-medium text-slate-500">{srv.durationText}</p>
                          </div>
                        </div>
                        
                        {/* Lógica de Preço Rasurado (Zero Reais se tiver Plano) */}
                        <div className="text-right mt-1">
                          {hasPlan ? (
                            <>
                              <p className="text-[10px] font-bold text-slate-400 line-through">R$ {srv.price.toFixed(2)}</p>
                              <p className="font-black text-emerald-600 text-lg leading-none">R$ 0,00</p>
                            </>
                          ) : (
                            <p className="font-black text-slate-900 text-lg">R$ {srv.price.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Quem vai te atender?</h2>
              <p className="text-sm font-medium text-slate-500 mb-8">Escolha o seu barbeiro de preferência.</p>
              
              <div className="grid grid-cols-2 gap-4">
                {professionals.map((prof, i) => {
                  const isFavoriteBarber = smartProfile?.lastAppointment?.professional_id === prof.id;
                  return (
                    <button 
                      key={i}
                      onClick={() => { setProfessional(prof); setStep(4); }}
                      className={`bg-white/80 border shadow-sm hover:shadow-md hover:bg-white rounded-[2rem] p-6 flex flex-col items-center text-center transition-all active:scale-95 relative overflow-hidden ${isFavoriteBarber ? 'border-amber-300 ring-1 ring-amber-100' : 'border-white'}`}
                    >
                      {isFavoriteBarber && (
                        <div className="absolute top-0 left-0 right-0 bg-amber-50 border-b border-amber-100 py-1 text-center">
                           <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">🏆 Seu Barbeiro</span>
                        </div>
                      )}
                      <div className={`w-16 h-16 rounded-full bg-cover bg-center border-4 shadow-sm mb-3 ${isFavoriteBarber ? 'border-amber-200 mt-4' : 'border-white'}`} style={{ backgroundImage: `url('https://i.pravatar.cc/150?img=${prof.avatar || '11'}')` }}></div>
                      <h4 className="font-black text-slate-900">{prof.name}</h4>
                      <p className="text-[10px] font-bold text-slate-500 mt-1 capitalize">{prof.role || 'Barbeiro'}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Qual o melhor horário?</h2>
              <p className="text-sm font-medium text-slate-500 mb-6">Nossa agenda em tempo real.</p>
              
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
                {availableDays.map((d, i) => {
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const dayStr = String(d.getDate()).padStart(2, '0');
                  const dateIso = `${y}-${m}-${dayStr}`;

                  const dayName = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                  const dayNum = d.getDate();
                  const isSelected = date === dateIso;

                  return (
                    <button
                      key={dateIso}
                      onClick={() => setDate(dateIso)}
                      className={`flex flex-col items-center justify-center min-w-[4.5rem] h-20 rounded-[1.5rem] transition-all flex-shrink-0 border shadow-sm
                        ${isSelected ? 'bg-[#1a1d2d] text-white border-[#1a1d2d] scale-105' : 'bg-white/80 text-slate-500 border-white hover:bg-white'}`}
                    >
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>{dayName}</span>
                      <span className={`text-xl font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>{dayNum}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex-1">
                {date ? (
                  <>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      Horários Livres {isLoadingTimes && <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin block"></span>}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableTimes.length > 0 ? availableTimes.map(t => (
                        <button
                          key={t}
                          onClick={() => setTime(t)}
                          className={`px-5 py-3 rounded-xl font-black transition-all border shadow-sm
                            ${time === t ? 'bg-[#1a1d2d] text-white border-[#1a1d2d]' : 'bg-white/80 text-slate-600 border-white hover:bg-white'}`}
                        >
                          {t}
                        </button>
                      )) : (
                        !isLoadingTimes && <p className="text-sm font-bold text-red-500 w-full py-4 text-center bg-white/50 rounded-xl">Agenda cheia neste dia.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <span className="text-4xl mb-2">📅</span>
                    <p className="text-sm font-bold text-slate-500">Selecione um dia acima</p>
                  </div>
                )}
              </div>

              {/* RESUMO DA RESERVA COM LÓGICA DE PREÇO FINAL */}
              <div className={`mt-6 transition-all duration-500 ${date && time ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                 <div className="bg-white/60 backdrop-blur-md border border-white shadow-sm rounded-2xl p-4 mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resumo da Reserva</p>
                      <h4 className="font-bold text-slate-900 text-sm">{service?.name}</h4>
                      <p className="text-xs font-medium text-slate-500">com {professional?.name}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                       <p className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 mb-1">
                         {formatVisualDate(date)} às {time}
                       </p>
                       <p className="font-black text-slate-900">
                         {smartProfile?.activeSubscription ? (
                           <span className="text-emerald-600">R$ 0,00 <span className="text-[10px] text-slate-400 line-through ml-1">R$ {service?.price.toFixed(2)}</span></span>
                         ) : (
                           `R$ ${service?.price.toFixed(2)}`
                         )}
                       </p>
                    </div>
                 </div>

                 <button 
                   onClick={handleConfirmBooking}
                   disabled={isScheduling}
                   className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 flex justify-center items-center gap-2"
                 >
                   {isScheduling ? (
                     <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   ) : (
                     <>Confirmar Reserva <span>✓</span></>
                   )}
                 </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-in zoom-in-95 fade-in duration-500 flex flex-col items-center justify-center text-center pt-10">
              
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl shadow-xl shadow-green-500/30 mb-6">
                ✓
              </div>
              
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Agendado, {name.split(' ')[0]}!</h2>
              <p className="text-base font-medium text-slate-600 mb-8">
                Sua cadeira está garantida dia <strong className="text-slate-900">{formatVisualDate(date)} às {time}</strong>.
              </p>

              {upsellProduct && upsellStatus !== 'success' && (
                <div className="w-full bg-white/80 backdrop-blur-xl border border-amber-200 shadow-xl shadow-amber-200/20 rounded-[2rem] p-6 mb-6 text-left relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 delay-500">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-bl-full -z-10"></div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl shadow-sm flex-shrink-0 z-10">
                       📦
                    </div>
                    <div className="z-10">
                      <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-widest">Leve junto hoje</span>
                      <h4 className="font-bold text-slate-900 text-base mt-1">{upsellProduct.name}</h4>
                    </div>
                  </div>
                  
                  <p className="text-sm font-medium text-slate-600 mb-5 relative z-10">
                    O barbeiro vai deixar separado na bancada para você. Deseja adicionar à sua visita?
                  </p>
                  
                  <div className="flex gap-2 relative z-10">
                    <button 
                      onClick={handleAcceptUpsell}
                      disabled={upsellStatus === 'loading'}
                      className="flex-1 py-3 px-4 bg-[#1a1d2d] hover:bg-slate-800 rounded-xl text-white text-xs font-black shadow-md transition-all active:scale-95 flex justify-between items-center disabled:opacity-50"
                    >
                      <span>{upsellStatus === 'loading' ? 'Adicionando...' : 'Adicionar'}</span>
                      {!upsellStatus && <span className="opacity-70">+ R$ {Number(upsellProduct.price).toFixed(2)}</span>}
                    </button>
                  </div>
                </div>
              )}

              {upsellStatus === 'success' && (
                <div className="w-full bg-green-50 border border-green-200 rounded-[2rem] p-6 mb-6 text-center animate-in zoom-in-95">
                  <span className="text-3xl block mb-2">🎉</span>
                  <h4 className="font-black text-green-800">Produto Separado!</h4>
                  <p className="text-sm text-green-700 mt-1">O item já está no seu carrinho para acerto no balcão.</p>
                </div>
              )}

            </div>
          )}

        </main>

      </div>
    </div>
  );
}