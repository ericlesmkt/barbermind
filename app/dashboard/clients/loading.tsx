import React from 'react';

export default function ClientsManagementLoading() {
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

      {/* MAIN CONTENT SKELETON */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative">
        <div className="absolute top-0 right-20 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl -z-10"></div>
        
        <div className="max-w-6xl mx-auto">
          
          {/* HEADER SKELETON */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="space-y-3">
              <div className="h-10 w-48 bg-slate-300/50 rounded-xl animate-pulse"></div>
              <div className="h-4 w-64 bg-slate-200/60 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-12 w-40 bg-slate-300/50 rounded-2xl animate-pulse"></div>
          </header>

          {/* PAINEL DE FILTROS SKELETON */}
          <section className="bg-white/40 backdrop-blur-2xl border border-white/70 shadow-xl rounded-[2rem] p-6 mb-8 animate-pulse">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 h-12 bg-white/60 rounded-2xl"></div>
              <div className="flex gap-4">
                <div className="w-32 h-12 bg-white/60 rounded-2xl"></div>
                <div className="w-32 h-12 bg-white/60 rounded-2xl"></div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/50 flex gap-2">
               <div className="w-16 h-8 bg-slate-200/50 rounded-xl"></div>
               <div className="w-24 h-8 bg-slate-300/50 rounded-xl"></div>
               <div className="w-24 h-8 bg-slate-200/50 rounded-xl"></div>
            </div>
          </section>

          {/* LISTAGEM DE CLIENTES SKELETON */}
          <section className="space-y-4 pb-12">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/40 border border-white/70 shadow-sm rounded-[1.5rem] p-5 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse">
                
                <div className="flex items-center gap-4 w-full md:w-auto md:min-w-[250px]">
                  <div className="w-14 h-14 rounded-full bg-slate-300/60 flex-shrink-0"></div>
                  <div className="space-y-2 w-full">
                    <div className="h-4 w-32 bg-slate-300/50 rounded"></div>
                    <div className="h-3 w-24 bg-slate-200/50 rounded"></div>
                  </div>
                </div>

                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-center flex-1 bg-white/30 p-3 rounded-2xl border border-white/50">
                   <div className="h-8 w-16 bg-slate-300/40 rounded"></div>
                   <div className="w-px h-8 bg-white/60"></div>
                   <div className="h-8 w-16 bg-slate-300/40 rounded"></div>
                   <div className="w-px h-8 bg-white/60"></div>
                   <div className="h-8 w-16 bg-slate-300/40 rounded"></div>
                </div>
                
                <div className="w-full md:w-auto">
                  <div className="h-10 w-24 bg-slate-200/60 rounded-xl"></div>
                </div>
              </div>
            ))}
          </section>

        </div>
      </main>
    </div>
  );
}