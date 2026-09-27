"use client"

import React from "react"
import { PropostasTab } from "@/components/caixa-de-propostas/minhas-propostas"

export default function HistoricoPage() {
  return (
    <div className="w-full selection:bg-blue-500/20">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
        <PropostasTab />
      </div>
    </div>
  )
}