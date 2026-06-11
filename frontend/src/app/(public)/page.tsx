"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  HeartHandshake,
  PackagePlus,
  Search,
  CheckCircle2
} from "lucide-react"
import Footer from "@/components/ui/Footer"

// 1. DADOS EXTRAÍDOS (Facilita a manutenção e limpa o JSX)
const HOW_IT_WORKS_STEPS = [
  {
    id: 1,
    title: "Anuncie seus Insumos",
    description: "Cadastre os materiais ou medicamentos que estão parados no seu estoque. Defina quantidades e especificações.",
    Icon: PackagePlus,
  },
  {
    id: 2,
    title: "Encontre a Demanda",
    description: "Nosso catálogo inteligente conecta seus produtos a clínicas e profissionais que estão buscando exatamente o que você tem.",
    Icon: Search,
  },
  {
    id: 3,
    title: "Feche Negócio",
    description: "Negocie diretamente pela plataforma. Seguro, rápido e com total transparência para ambas as partes envolvidas.",
    Icon: HeartHandshake,
  }
]

const PLAN_FEATURES = [
  "Acesso completo ao catálogo",
  "Publicação ilimitada de insumos",
  "Painel de gerenciamento de lotes",
  "Sem comissões por negócio",
  "Suporte prioritário"
]

export default function MedConnectLanding() {
  return (
    <main className="w-full min-h-screen">

     {/* SEÇÃO 1: Hero */}
      <section
        id="sobre"
        className="relative w-full min-h-screen flex items-center px-6 lg:px-8 bg-linear-to-b from-zinc-50 via-zinc-50 via-50% to-zinc-100 lg:bg-linear-to-r overflow-hidden"
      >
        {/* O container do conteúdo tem z-10, ficando ACIMA da nossa sombra de transição */}
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center z-10 py-12 lg:py-24">

          {/* Lado Esquerdo: Conteúdo de Texto */}
          <div className="space-y-8 text-center lg:text-left">
            <h1 className="text-4xl lg:text-6xl font-black text-slate-800 tracking-tight leading-[1.1]">
              A plataforma B2B definitiva para suas <span className="text-sky-700">negociações médicas.</span>
            </h1>
            <p className="text-lg text-slate-700 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Nascemos com um propósito claro: evitar o desperdício na saúde. O MedConnect é a ponte que conecta clínicas e profissionais que possuem insumos e materiais parados àqueles que realmente precisam, de forma rápida, segura e inteligente.
            </p>
          </div>

          {/* Lado Direito (Mobile): Visível apenas no celular/tablet para manter o fluxo */}
          <div className="w-full h-72 md:h-96 lg:hidden relative rounded-2xl overflow-hidden">
            <img 
              src="../stock.jpg" 
              alt="Stock medical photo" 
              className="w-full h-full object-cover"
            />
          </div>

        </div>

        {/* Lado Direito (Desktop): Ocupa toda a metade direita (z-0) */}
        <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-1/2 h-full z-0">
          {/* Imagem com fade na esquerda */}
          <img 
            src="../stock.jpg" 
            alt="Stock medical photo" 
            className="w-full h-full object-cover mask-[linear-gradient(to_right,transparent,black_40%,black_100%)]" 
          />
          {/* Sombra vindo da direita para a esquerda */}
          <div className="absolute inset-0 bg-linear-to-l from-black/50 via-black/10 to-transparent" />
        </div>

        {/* CAMADA DE TRANSIÇÃO (Efeito máscara no fundo/imagem)
          Fica no z-5: Acima da imagem (z-0), mas abaixo do texto (z-10).
          Isso faz a imagem e o fundo sumirem suavemente em direção ao branco da Seção 2.
        */}
        <div className="absolute bottom-0 left-0 right-0 h-90 bg-linear-to-t from-zinc-50 to-transparent z-5" />
      </section>

      {/* SEÇÃO 2: Como Funciona */}
      <section id="como-funciona" className="scroll-mt-24 py-24 mt-24 bg-white border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight mb-4">
              Como funciona o MedConnect?
            </h2>
            <p className="text-lg text-slate-500">
              Simplificamos o processo para que você possa focar no que importa: salvar vidas e otimizar recursos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-linear-to-r from-slate-100 via-slate-200 to-slate-100" />

            {/* Renderização Dinâmica dos Passos */}
            {HOW_IT_WORKS_STEPS.map(({ id, title, description, Icon }) => (
              <div key={id} className="relative flex flex-col items-center text-center group">
                <div className="w-24 h-24 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center mb-6 relative z-10 group-hover:-translate-y-2 transition-all duration-300">
                  <Icon className="w-10 h-10 text-sky-600" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-sky-700 text-zinc-50 font-bold rounded-full flex items-center justify-center shadow-md border-2 border-zinc-50">
                    {id}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* SEÇÃO DE VÍDEO */}
      <section className="py-24 px-6 lg:px-8 bg-slate-50 border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight mb-4">
            Conectando quem tem com quem precisa!
          </h2>
          <p className="text-lg text-slate-500 mb-10">
            Veja como o MedConnect está conectando hospitais com tecnologia, propósito e responsabilidade.
          </p>
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-sky-950/10 border border-slate-200/60">
            <video
              controls
              className="w-full aspect-video bg-black"
              preload="metadata"
            >
              <source src="/MedConnect_VIDEO.mp4" type="video/mp4" />
              Seu navegador não suporta a reprodução de vídeo.
            </video>
          </div>
        </div>
      </section>


      {/* SEÇÃO 3: Planos */}
      <section id="planos" className="scroll-mt-24 py-24 px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight mb-4">
            Um preço único, acesso completo.
          </h2>
          <p className="text-lg text-slate-500">
            Sem taxas escondidas. Assine e tenha liberdade total para gerenciar e conectar seus estoques.
          </p>
        </div>

        <div className="flex justify-center w-full">
          <Card className="w-full max-w-5xl overflow-hidden border-slate-200/60 shadow-2xl shadow-sky-950/10 grid grid-cols-1 md:grid-cols-5 p-0">
            <div className="bg-sky-900 p-10 md:col-span-2 flex flex-col justify-center items-center text-center relative overflow-hidden">
              <h3 className="text-xl font-bold text-slate-200 mb-2 z-10">Plano Profissional</h3>
              <div className="flex items-start justify-center gap-1 z-10">
                <span className="text-2xl font-bold text-slate-100 mt-2">R$</span>
                <span className="text-6xl font-black text-slate-100 tracking-tighter">15,99</span>
              </div>
              <span className="text-slate-300 font-medium mt-1 z-10">por mês  (R$191,98 anualmente)</span>
            </div>

            <CardContent className="p-10 md:col-span-3 flex flex-col justify-center bg-white border-none m-0">
              <h4 className="text-lg font-bold text-slate-800 mb-6">Tudo o que está incluído:</h4>
              <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-4 mb-8">
                {/* Renderização Dinâmica dos Benefícios */}
                {PLAN_FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-sky-700 shrink-0" />
                    <span className="text-slate-600 text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4">
                <Link href="/auth" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto h-12 px-8 bg-sky-700 hover:bg-sky-800 text-zinc-50 font-bold rounded-xl text-md transition-all shadow-md">
                    Criar conta e Assinar
                  </Button>
                </Link>
                <p className="text-xs text-slate-400 text-center sm:text-left">
                  Cancele quando quiser.<br />Pagamento seguro.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      <Footer />
    </main>
  )
}