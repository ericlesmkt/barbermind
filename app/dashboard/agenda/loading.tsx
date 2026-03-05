import React from 'react';

export default function AgendaLoading() {
  const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans text-slate-800">
      
      {/* SIDEBAR SKELETON */}
      <aside className="hidden md:flex w-64 flex-col p-6 bg-white/40 backdrop-blur-xl border-r border-slate-200/60 shadow-xl z-20">
        <div className="mb-10 px-2 space-y-2">
          <div className="h-8 w-3/4 bg-slate-200/60 rounded-lg animate-pulse"></div>
          <div className="h-3 w-1/2 bg-slate-200/60 rounded-lg animate-pulse"></div>
        </div>
        <div className="space-y-4 flex-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 w-full bg-slate-200/50 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL SKELETON */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative bg-gradient-to-br from-slate-100 via-gray-200 to-zinc-300">
        <div className="max-w-5xl mx-auto">
          
          <header className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2">
              <div className="flex-1 space-y-6">
                
                {/* Título e Mês */}
                <div className="space-y-3">
                   <div className="h-10 w-40 bg-slate-300/50 rounded-xl animate-pulse"></div>
                   <div className="h-4 w-32 bg-slate-200/60 rounded-lg animate-pulse"></div>
                </div>

                {/* Date Strip */}
                <div className="flex gap-2 overflow-hidden">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="w-[4rem] h-16 bg-white/40 rounded-2xl animate-pulse flex-shrink-0 border border-white/50"></div>
                  ))}
                </div>
              </div>

              {/* Filtros */}
              <div className="flex gap-2 bg-white/40 p-1.5 rounded-2xl border border-white/60">
                 {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-20 h-9 bg-slate-200/50 rounded-xl animate-pulse"></div>
                 ))}
              </div>
            </div>
          </header>

          {/* GRID DA AGENDA SKELETON */}
          <section className="bg-white/40 backdrop-blur-2xl border border-white/70 shadow-2xl rounded-[2.5rem] p-6 md:p-10">
            <div className="relative space-y-2">
              {hours.map((hour) => (
                <div key={hour} className="flex relative">
                  {/* Horário na esquerda */}
                  <div className="w-16 flex-shrink-0 text-right pr-4 py-6 relative">
                    <span className="text-xs font-bold text-slate-400 opacity-50">{hour}</span>
                    <div className="absolute top-9 left-16 w-[calc(100vw-6rem)] md:w-[800px] border-t border-white/50 -z-10"></div>
                  </div>
                  
                  {/* Bloco de Agendamento Simulando Pulse */}
                  <div className="flex-1 relative min-h-[5rem] py-1">
                    <div className="absolute top-1 left-2 w-[95%] md:w-[80%] h-[calc(100%-8px)] rounded-2xl bg-white/30 backdrop-blur-sm border border-white/50 animate-pulse flex items-center p-4 gap-4">
                       <div className="w-1.5 h-10 rounded-full bg-slate-200/50"></div>
                       <div className="w-10 h-10 rounded-full bg-slate-200/60"></div>
                       <div className="space-y-2 flex-1">
                         <div className="h-3 w-1/3 bg-slate-300/60 rounded-md"></div>
                         <div className="h-2 w-1/4 bg-slate-200/60 rounded-md"></div>
                       </div>
                       <div className="space-y-2 flex flex-col items-end">
                         <div className="h-4 w-16 bg-slate-300/50 rounded-md"></div>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}