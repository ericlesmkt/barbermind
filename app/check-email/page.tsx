import Link from 'next/link'

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 text-center">
        
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Verifique o seu email!</h2>
        <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">
          Nós enviámos um link mágico de recuperação. Dê uma olhada na sua caixa de entrada (e no spam, por via das dúvidas) e clique no link para criar a sua nova senha.
        </p>
        
        <Link 
          href="/login" 
          className="inline-block w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-xl shadow-lg transition-transform active:scale-95"
        >
          Voltar para o Início
        </Link>

      </div>
    </div>
  )
}