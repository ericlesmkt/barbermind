import React from 'react';
import { login } from '@/app/actions/auth';

// No Next.js 15, searchParams é uma Promise, então tratamos de forma assíncrona
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const errorMessage = params?.error;

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 font-sans text-slate-800 relative overflow-hidden">
      
      {/* Luzes de Fundo (Glow) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/50 rounded-full blur-[100px] -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-300/50 rounded-full blur-[100px] -z-10"></div>

      <div className="w-full max-w-[440px]">
        
        {/* Logo / Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-16 h-16 bg-[#1a1d2d] rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xl shadow-slate-900/20">
            <span className="text-white text-2xl">✂️</span>
          </div>
          <h1 className="text-3xl font-black text-[#1a1d2d] tracking-tight">BarberMind</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">Acesso Restrito</p>
        </div>

        {/* ========================================= */}
        {/* MASTER CARD DE LOGIN */}
        {/* ========================================= */}
        <form 
          action={login} 
          className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden animate-in zoom-in-95 duration-500"
        >
          <div className="space-y-6">
            
            {errorMessage && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3">
                <span className="text-red-500">⚠️</span>
                <p className="text-xs font-bold text-red-600">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">E-mail Profissional</label>
              <input 
                type="email" 
                name="email"
                required
                placeholder="contato@suabarbearia.com" 
                className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 rounded-2xl px-6 py-4 text-slate-800 placeholder-slate-400 font-bold outline-none transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Senha</label>
              <input 
                type="password" 
                name="password"
                required
                placeholder="••••••••" 
                className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 rounded-2xl px-6 py-4 text-slate-800 placeholder-slate-400 font-bold outline-none transition-all shadow-sm tracking-widest"
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                className="w-full py-4 rounded-2xl bg-[#111827] text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all flex justify-center items-center gap-2"
              >
                Entrar no Sistema
              </button>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-[10px] font-bold text-slate-400">Esqueceu a senha? Fale com o administrador.</p>
          </div>
        </form>

      </div>
    </div>
  );
}