"use client";

import React from 'react';

export default function CancelPlanButton({ 
  cancelAction 
}: { 
  cancelAction: (formData: FormData) => void 
}) {
  return (
    <form action={cancelAction}>
      <button 
        type="submit" 
        onClick={(e) => {
          if (!window.confirm('Tem certeza que deseja cancelar este plano? O cliente perderá os benefícios imediatamente.')) {
            e.preventDefault(); // Impede o formulário de ser enviado se ele cancelar
          }
        }}
        className="w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        title="Cancelar Plano"
      >
        ✕
      </button>
    </form>
  );
}