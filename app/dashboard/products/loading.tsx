import React from 'react';

export default function ProductsLoading() {
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
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div className="space-y-3">
              <div className="h-10 w-64 bg-slate-300/50 rounded-xl animate-pulse"></div>
              <div className="h-4 w-48 bg-slate-200/60 rounded-lg animate-pulse"></div>
            </div>
            
            <div className="h-12 w-40 bg-slate-300/50 rounded-2xl animate-pulse"></div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/50 border border-white p-6 rounded-[2rem] shadow-sm animate-pulse flex flex-col justify-center min-h-[120px] space-y-3">
                <div className="h-3 w-1/2 bg-slate-200/60 rounded-lg"></div>
                <div className="h-8 w-3/4 bg-slate-300/50 rounded-xl"></div>
              </div>
            ))}
          </div>

          <div className="bg-white/50 border border-white shadow-xl rounded-[2.5rem] overflow-hidden animate-pulse">
            <div className="h-16 bg-slate-200/40 border-b border-slate-100"></div>
            <div className="divide-y divide-slate-100/50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between px-8 py-6">
                  <div className="space-y-2 w-1/4">
                    <div className="h-4 w-3/4 bg-slate-300/60 rounded-md"></div>
                    <div className="h-3 w-1/4 bg-slate-200/60 rounded-md"></div>
                  </div>
                  <div className="h-4 w-16 bg-slate-200/60 rounded-md"></div>
                  <div className="h-4 w-16 bg-slate-200/60 rounded-md"></div>
                  <div className="h-6 w-8 bg-slate-300/60 rounded-md"></div>
                  <div className="h-10 w-10 bg-slate-200/60 rounded-xl"></div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}