import React from 'react';

export default function RankingLoading() {
  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans text-slate-800">
      
      {/* SIDEBAR SKELETON */}
      <aside className="hidden md:flex w-64 flex-col p-6 bg-white/40 backdrop-blur-xl border-r border-slate-200/60 shadow-xl z-20">
        <div className="mb-10 px-2 space-y-2">
          <div className="h-8 w-3/4 bg-slate-200/60 rounded-lg animate-pulse"></div>
          <div className="h-3 w-1/2 bg-slate-200/60 rounded-lg animate-pulse"></div>
        </div>
        <div className="space-y-4 flex-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-12 w-full bg-slate-200/50 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT SKELETON */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative">
        <div className="absolute top-0 right-20 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl -z-10"></div>
        <div className="max-w-6xl mx-auto w-full">
          
          {/* HEADER SKELETON */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div className="space-y-3">
              <div className="h-10 w-48 bg-slate-300/50 rounded-xl animate-pulse"></div>
              <div className="h-4 w-64 bg-slate-200/60 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-12 w-56 bg-slate-300/50 rounded-2xl animate-pulse"></div>
          </header>

          <div className="bg-white/40 backdrop-blur-2xl border border-white/70 shadow-xl rounded-[2.5rem] p-8 md:p-14 relative overflow-hidden">
            
            {/* TÍTULO CENTRAL SKELETON */}
            <div className="text-center mb-16 flex flex-col items-center space-y-4 animate-pulse">
              <div className="h-12 w-64 bg-slate-300/50 rounded-xl"></div>
              <div className="h-4 w-40 bg-slate-200/60 rounded-md"></div>
              <div className="mt-8 h-10 w-36 bg-slate-200/60 rounded-full"></div>
            </div>

            {/* CARTÕES DO PÓDIO SKELETON */}
            <div className="flex flex-wrap justify-center gap-8 md:gap-14 perspective-1000">
               {[1, 2, 3].map(i => (
                 <div key={i} className="w-72 aspect-[2/3] rounded-[2rem] bg-slate-200/50 animate-pulse border-4 border-white shadow-md"></div>
               ))}
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}