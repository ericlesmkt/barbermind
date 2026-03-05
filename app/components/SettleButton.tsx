"use client";

import React from 'react';

export default function SettleButton({ 
  actionFn, 
  professionalName 
}: { 
  actionFn: () => void, 
  professionalName: string 
}) {
  return (
    <form action={actionFn}>
      <button 
        type="submit" 
        onClick={(e) => {
          if (!window.confirm(`Tem a certeza que deseja ZERAR a conta de ${professionalName} e marcar tudo como pago?`)) {
            e.preventDefault();
          }
        }}
        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/30 flex justify-center items-center gap-2"
      >
        <span>💸</span> Pagar e Fechar Ciclo
      </button>
    </form>
  );
}