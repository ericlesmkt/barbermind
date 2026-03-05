import Link from 'next/link'
import { resetPassword } from '@/app/actions/auth'

export default function EsqueciSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
        
        {/* CABEÇALHO */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1a1d2d] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/20">
            <span className="text-white text-2xl">✂️</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recuperar Acesso</h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Digite o email da sua conta BarberMind e nós enviaremos um link para criar uma nova senha.
          </p>
        </div>
        
        {/* FORMULÁRIO */}
        <form action={resetPassword} className="space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu Email</label>
            <input 
              type="email" 
              name="email" 
              required 
              placeholder="contato@barbearia.com" 
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-transform active:scale-95 flex justify-center items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            Enviar Link de Recuperação
          </button>
        </form>

        {/* VOLTAR PARA O LOGIN */}
        <div className="mt-8 text-center">
          <Link href="/login" className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors">
            ← Voltar para o Login
          </Link>
        </div>

      </div>
    </div>
  )
}