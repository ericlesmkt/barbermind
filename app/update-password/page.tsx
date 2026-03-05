import { updateNewPassword } from '@/app/actions/auth'

export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6]">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Criar Nova Senha</h2>
        <p className="text-sm text-slate-500 mb-6">Digite a sua nova senha segura abaixo.</p>
        
        <form action={updateNewPassword} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
            <input 
              type="password" 
              name="password" 
              required 
              placeholder="••••••••" 
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-lg transition-transform active:scale-95"
          >
            Salvar Senha e Entrar
          </button>
        </form>
      </div>
    </div>
  )
}