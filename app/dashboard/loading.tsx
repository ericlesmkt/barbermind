import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans">
      
      {/* SIDEBAR SKELETON */}
      <aside className="hidden md:flex w-64 flex-col p-6 bg-white/40 backdrop-blur-xl border-r border-slate-200/60 shadow-xl z-20">
        <div className="mb-10 px-2 space-y-2">
          <div className="h-8 w-3/4 bg-slate-200/60 rounded-lg animate-pulse"></div>
          <div className="h-3 w-1/2 bg-slate-200/60 rounded-lg animate-pulse"></div>
        </div>
        <div className="space-y-4 flex-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 w-full bg-slate-200/50 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT SKELETON */}
      <main className="flex-1 flex flex-col p-4 md:p-10">
        <div className="max-w-6xl mx-auto w-full flex-1 space-y-10">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3 w-1/3">
              <div className="h-10 w-full max-w-[200px] bg-slate-200/70 rounded-xl animate-pulse"></div>
              <div className="h-4 w-64 bg-slate-200/50 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-10 w-72 bg-slate-200/60 rounded-xl animate-pulse"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              {/* SKELETON: CARDS DE FATURAMENTO E TICKET MÉDIO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-48 bg-white/50 border border-white rounded-[2.5rem] p-8 animate-pulse shadow-sm flex flex-col justify-between">
                     <div className="flex justify-between items-center mb-6">
                       <div className="h-3 w-1/3 bg-slate-200 rounded-lg"></div>
                       <div className="h-4 w-4 bg-slate-200 rounded-full"></div>
                     </div>
                     <div className="h-12 w-2/3 bg-slate-300 rounded-xl"></div>
                     <div className="h-6 w-1/2 bg-slate-200/50 rounded-lg mt-4"></div>
                  </div>
                ))}
              </div>

              {/* SKELETON: VISÃO DO SALÃO (COM ESPAÇO PARA O BOTÃO DE CHECKOUT E PRODUTO) */}
              <div>
                <div className="h-3 w-40 bg-slate-200 rounded-lg mb-4 ml-2 animate-pulse"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white/50 border border-white rounded-[2rem] p-5 animate-pulse shadow-sm flex flex-col min-h-[260px]">
                       <div className="flex gap-4 items-center mb-4">
                          <div className="w-14 h-14 rounded-full bg-slate-200 flex-shrink-0"></div>
                          <div className="space-y-2 flex-1">
                             <div className="h-2 w-1/3 bg-slate-200 rounded"></div>
                             <div className="h-4 w-3/4 bg-slate-300 rounded"></div>
                             <div className="h-3 w-1/2 bg-slate-200 rounded"></div>
                          </div>
                       </div>
                       
                       {/* Área do Checkout e Alerta Logístico */}
                       <div className="mt-auto border-t border-slate-200/60 pt-4 space-y-3">
                          {/* Simula o bloco amarelo da pomada */}
                          <div className="h-16 w-full bg-amber-50/50 rounded-xl"></div>
                          {/* Simula o botão verde de receber */}
                          <div className="h-10 w-full bg-green-200/50 rounded-xl"></div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SKELETON: BACKLOG DO SISTEMA */}
              <div>
                 <div className="h-3 w-40 bg-slate-200 rounded-lg mb-4 ml-2 animate-pulse"></div>
                 <div className="h-48 bg-white/50 border border-white rounded-[2rem] p-4 animate-pulse shadow-sm space-y-4">
                    {[...Array(2)].map((_, i) => (
                       <div key={i} className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-0">
                          <div className="w-2 h-2 rounded-full bg-slate-300 mt-1"></div>
                          <div className="space-y-2 flex-1">
                             <div className="h-3 w-1/3 bg-slate-300 rounded"></div>
                             <div className="h-2 w-full bg-slate-200 rounded"></div>
                             <div className="h-2 w-2/3 bg-slate-200 rounded"></div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

            </div>

            {/* SKELETON: FEED INTELIGENTE DA IA */}
            <div className="lg:col-span-1">
              <div className="h-[750px] bg-white/50 border border-white rounded-[2.5rem] p-8 animate-pulse shadow-sm space-y-6">
                 <div className="flex justify-between items-center mb-8">
                    <div className="h-4 w-1/2 bg-slate-200 rounded-lg"></div>
                    <div className="h-4 w-4 rounded-full bg-slate-200"></div>
                 </div>
                 {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-4 items-center p-3">
                       <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0"></div>
                       <div className="space-y-2 flex-1">
                          <div className="h-4 w-3/4 bg-slate-300 rounded-lg"></div>
                          <div className="h-3 w-1/2 bg-slate-200 rounded-lg"></div>
                       </div>
                    </div>
                 ))}
              </div>
            </div>
          </div>
          
          {/* FOOTER SKELETON */}
          <footer className="mt-16 pt-8 pb-4 flex flex-col items-center justify-center opacity-50">
            <div className="w-8 h-8 bg-slate-200 rounded-lg mb-3 animate-pulse"></div>
            <div className="h-2 w-32 bg-slate-200 rounded animate-pulse"></div>
          </footer>
        </div>
      </main>
    </div>
  );
}