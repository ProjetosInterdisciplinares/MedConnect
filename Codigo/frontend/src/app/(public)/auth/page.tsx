"use client"

import React, { JSX, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import Form from "./components/form"

/** Tela de login/cadastro: ocupa exatamente a janela, sem rolagem e sem a barra do site. */
export default function Auth(): JSX.Element {
  useEffect(() => {
    const html = document.documentElement
    const anterior = html.style.overflow
    html.style.overflow = "hidden"
    return () => { html.style.overflow = anterior }
  }, [])

  return (
    <div className="w-full h-dvh flex flex-col overflow-hidden bg-slate-50">
      <header className="shrink-0 h-14 px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" aria-label="MedConnect, página inicial">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-700">
            <img src="/med-icon.svg" alt="" className="w-5 h-5 invert" />
          </span>
          <span className="font-bold text-lg text-slate-900 tracking-tight">
            Med<span className="text-blue-700">Connect</span>
          </span>
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Voltar ao site</span>
          <span className="sm:hidden">Início</span>
        </Link>
      </header>
      <div className="flex-1 min-h-0 flex">
        <Form />
      </div>
    </div>
  )
}
