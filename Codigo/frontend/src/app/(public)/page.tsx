"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import {
  HeartHandshake,
  PackagePlus,
  Search,
  CheckCircle2,
  ArrowRight,
  Play,
} from "lucide-react"
import Footer from "@/components/ui/Footer"

// ─── PALETA DE CORES ──────────────────────────────────────────────────────
// Teal-950: #172554  (fundos escuros)
// Teal-900: #1e3a8a  (fundos escuros secundários)
// Teal-800: #1e40af  (textos destaque escuro)
// Teal-700: #1d4ed8  (textos destaque)
// Teal-600: #2563eb  (CTA principal)
// Teal-500: #3b82f6  (acentos vibrantes)
// Teal-400: #60a5fa  (acentos claros)
// Teal-300: #93c5fd  (badges, destaques leves)
// Teal-200: #bfdbfe  (fundos sutis)
// Teal-100: #dbeafe  (fundos cards)
// Teal-50:  #eff6ff  (fundos seção)

// ─── DATA ────────────────────────────────────────────────────────────────
const HOW_IT_WORKS_STEPS = [
  {
    id: 1,
    title: "Anuncie seus Insumos",
    description:
      "Cadastre os materiais ou medicamentos que estão parados no seu estoque. Defina quantidades e especificações.",
    Icon: PackagePlus,
  },
  {
    id: 2,
    title: "Encontre a Demanda",
    description:
      "Nosso catálogo inteligente conecta seus produtos a clínicas e profissionais que estão buscando exatamente o que você tem.",
    Icon: Search,
  },
  {
    id: 3,
    title: "Feche Negócio",
    description:
      "Negocie diretamente pela plataforma. Seguro, rápido e com total transparência para ambas as partes envolvidas.",
    Icon: HeartHandshake,
  },
]

// Pacote inicial definido em backend/creditos/migrations/0002_pacotes_iniciais.py.
// O preço pode ser alterado no Django Admin; manter este texto sincronizado.
const PACOTE_INICIAL = { creditos: 50, preco: "R$ 25,00" }

const CREDIT_USES = [
  "Publicar anúncios de materiais e medicamentos",
  "Gerar descrições de materiais com IA",
]

// ─── HOOKS ───────────────────────────────────────────────────────────────

// O hook useMousePosition foi removido

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          obs.unobserve(el)
        }
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, isVisible }
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────

// O componente MouseGlow foi removido

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            width: `${6 + i * 5}px`,
            height: `${6 + i * 5}px`,
            background: `radial-gradient(circle, rgba(59,130,246,${0.5 - i * 0.08}) 0%, transparent 70%)`,
            left: `${12 + i * 18}%`,
            top: `${25 + ((i * 31) % 50)}%`,
            animationDelay: `${i * 1.5}s`,
            animationDuration: `${7 + i * 2}s`,
          }}
        />
      ))}
    </div>
  )
}

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const { ref, isVisible } = useInView()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(32px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

function StepCard({
  id,
  title,
  description,
  Icon,
  delay,
}: {
  id: number
  title: string
  description: string
  Icon: React.ElementType
  delay: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: y * -6, y: x * 6 })
  }, [])

  return (
    <AnimatedSection delay={delay}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setTilt({ x: 0, y: 0 })
        }}
        className="relative flex flex-col items-center text-center group cursor-default p-8 rounded-2xl transition-colors duration-500"
        style={{
          transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 0.2s ease-out",
          backgroundColor: isHovered ? "rgba(240,253,250,0.8)" : "transparent",
        }}
      >
        {/* Glow halo */}
        <div
          className="absolute -inset-2 rounded-3xl transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
            opacity: isHovered ? 1 : 0,
          }}
        />

        <div
          className="relative w-18 h-18 rounded-2xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-all duration-500"
          style={{
            background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
            border: "1px solid rgba(59,130,246,0.2)",
            boxShadow: isHovered
              ? "0 12px 30px rgba(59,130,246,0.15)"
              : "0 4px 12px rgba(59,130,246,0.08)",
          }}
        >
          <Icon className="w-8 h-8 text-blue-600 group-hover:text-blue-500 transition-colors duration-300" />
          <div
            className="absolute -top-2 -right-2 w-6 h-6 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            }}
          >
            {id}
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-800 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
          {description}
        </p>
      </div>
    </AnimatedSection>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────

export default function MedConnectLanding() {
  const heroRef = useRef<HTMLElement>(null)
  const [videoPlaying, setVideoPlaying] = useState(false)

  return (
    <main className="w-full min-h-screen overflow-hidden">
      {/* ══════════════════════ HERO ══════════════════════ */}
      <section
        ref={heroRef}
        id="sobre"
        className="relative w-full min-h-screen flex items-center px-6 lg:px-8 overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #ffffff 0%, #eff6ff 25%, #dbeafe 50%, #eff6ff 75%, #ffffff 100%)",
        }}
      >
        <FloatingParticles />

        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] z-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center z-10 py-16 lg:py-24">
          {/* Text */}
          <div className="space-y-6 text-center lg:text-left">
            <AnimatedSection>
              <div
                className="inline-flex items-center px-4 py-1.5 rounded-full backdrop-blur-sm"
                style={{
                  background: "rgba(219,234,254,0.6)",
                  border: "1px solid rgba(59,130,246,0.2)",
                }}
              >
                <span className="text-sm font-semibold text-blue-700">
                  Plataforma B2B para Saúde
                </span>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-800 tracking-tight leading-[1.1] max-w-xl mx-auto lg:mx-0">
                A plataforma que conecta instituições de saúde.
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <p className="text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Negocie materiais e medicamentos hospitalares com outras
                instituições.
              </p>
            </AnimatedSection>

            {/* CTA */}
            <AnimatedSection delay={300}>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link href="/auth">
                  <button
                    className="group relative h-13 px-8 text-white font-bold rounded-xl text-base transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                      boxShadow: "0 6px 24px rgba(59,130,246,0.25)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 8px 32px rgba(59,130,246,0.35)"
                      e.currentTarget.style.background = "linear-gradient(135deg, #60a5fa, #3b82f6)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 6px 24px rgba(59,130,246,0.25)"
                      e.currentTarget.style.background = "linear-gradient(135deg, #3b82f6, #2563eb)"
                    }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                    <span className="relative flex items-center gap-2">
                      Começar Agora
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  </button>
                </Link>
                <Link
                  href="#como-funciona"
                  className="flex items-center gap-2 text-slate-600 hover:text-blue-700 font-semibold transition-colors duration-300 group"
                >
                  Saiba mais
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300 text-blue-600" />
                </Link>
              </div>
            </AnimatedSection>
          </div>

          {/* Hero image (mobile) */}
          <div className="w-full h-72 md:h-96 lg:hidden relative rounded-2xl overflow-hidden shadow-2xl">
            <img
              src="../stock.jpg"
              alt="Profissionais da saúde negociando insumos"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/30 to-transparent" />
          </div>
        </div>

        {/* Hero image (desktop) */}
        <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-1/2 h-full z-0">
          <img
            src="../stock.jpg"
            alt="Profissionais da saúde negociando insumos"
            className="w-full h-full object-cover mask-[linear-gradient(to_right,transparent,black_35%,black_100%)]"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-blue-950/15 via-transparent to-transparent" />
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent z-[5]" />
      </section>

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section id="como-funciona" className="scroll-mt-24 relative py-28 bg-white">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: "rgba(240,253,250,0.5)", filter: "blur(80px)" }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <AnimatedSection>
            <div className="text-center max-w-3xl mx-auto mb-20">
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 uppercase tracking-wider"
                style={{
                  background: "rgba(240,253,250,0.8)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  color: "#1d4ed8",
                }}
              >
                Processo
              </span>
              <h2 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight mb-4">
                Como funciona o MedConnect?
              </h2>
              <p className="text-lg text-slate-500">
                Simplificamos o processo para que você possa focar no que
                importa: salvar vidas e otimizar recursos.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-px">
              <div
                className="w-full h-full"
                style={{ background: "linear-gradient(to right, rgba(59,130,246,0.1), rgba(59,130,246,0.2), rgba(59,130,246,0.1))" }}
              />
            </div>

            {HOW_IT_WORKS_STEPS.map(({ id, title, description, Icon }, i) => (
              <StepCard
                key={id}
                id={id}
                title={title}
                description={description}
                Icon={Icon}
                delay={i * 150}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ VIDEO ══════════════════════ */}
      <section
        className="relative py-28 px-6 lg:px-8 overflow-hidden"
        style={{ background: "linear-gradient(180deg, #f8fffe 0%, #ffffff 100%)" }}
      >
        <div
          className="absolute top-20 -right-40 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "rgba(219,234,254,0.3)", filter: "blur(60px)" }}
        />
        <div
          className="absolute bottom-20 -left-40 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "rgba(219,234,254,0.3)", filter: "blur(60px)" }}
        />

        <div className="max-w-4xl mx-auto text-center relative">
          <AnimatedSection>
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 uppercase tracking-wider"
              style={{
                background: "rgba(240,253,250,0.8)",
                border: "1px solid rgba(59,130,246,0.15)",
                color: "#1d4ed8",
              }}
            >
              Vídeo
            </span>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight mb-4">
              Conectando quem tem com quem precisa!
            </h2>
            <p className="text-lg text-slate-500 mb-12">
              Veja como o MedConnect está conectando hospitais com tecnologia,
              propósito e responsabilidade.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <div
              className="relative group rounded-2xl overflow-hidden transition-shadow duration-500"
              style={{
                boxShadow: "0 25px 60px rgba(4,47,46,0.08), 0 4px 20px rgba(59,130,246,0.06)",
                border: "1px solid rgba(59,130,246,0.1)",
              }}
            >
              <video
                controls
                className="w-full aspect-video bg-slate-900"
                preload="metadata"
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
              >
                <source src="/MedConnect_VIDEO.mp4" type="video/mp4" />
                Seu navegador não suporta a reprodução de vídeo.
              </video>
              {!videoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 group-hover:bg-slate-900/20 transition-colors duration-300 pointer-events-none">
                  <div
                    className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                    style={{ boxShadow: "0 8px 30px rgba(4,47,46,0.15)" }}
                  >
                    <Play className="w-6 h-6 text-blue-700 ml-1" />
                  </div>
                </div>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ══════════════════════ CRÉDITOS ══════════════════════ */}
      <section
        id="creditos"
        className="scroll-mt-24 relative pt-28 pb-16 px-6 lg:px-8 overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #eff6ff 50%, #ffffff 100%)",
        }}
      >
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "rgba(219,234,254,0.3)", filter: "blur(80px)" }}
        />

        <div className="max-w-7xl mx-auto relative">
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 uppercase tracking-wider"
                style={{
                  background: "rgba(240,253,250,0.8)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  color: "#1d4ed8",
                }}
              >
                Créditos
              </span>
              <h2 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight mb-4">
                Créditos sob demanda, sem mensalidade.
              </h2>
              <p className="text-lg text-slate-500">
                Compre créditos quando precisar e use-os para publicar anúncios
                e gerar descrições de materiais com IA.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <div className="flex justify-center w-full">
              <Card
                className="w-full max-w-5xl overflow-hidden grid grid-cols-1 md:grid-cols-5 p-0 group transition-all duration-500"
                style={{
                  border: "1px solid rgba(59,130,246,0.1)",
                  boxShadow: "0 25px 60px rgba(4,47,46,0.06), 0 4px 20px rgba(59,130,246,0.04)",
                }}
              >
                {/* Price panel */}
                <div
                  className="relative p-10 md:col-span-2 flex flex-col justify-center items-center text-center overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #1e40af, #1e3a8a, #172554)",
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                      backgroundSize: "24px 24px",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                  <div className="flex items-baseline justify-center gap-2 relative z-10">
                    <span className="text-6xl font-black text-white tracking-tighter">
                      {PACOTE_INICIAL.creditos}
                    </span>
                    <span className="text-xl font-bold text-blue-100">créditos</span>
                  </div>
                  <span className="text-blue-200 font-semibold mt-3 text-lg relative z-10">
                    por {PACOTE_INICIAL.preco}
                  </span>
                </div>

                {/* Uses panel */}
                <CardContent className="p-10 md:col-span-3 flex flex-col justify-center bg-white border-none m-0">
                  <h4 className="text-lg font-bold text-slate-800 mb-6">
                    Onde os créditos são usados:
                  </h4>
                  <ul className="grid gap-y-4 mb-8">
                    {CREDIT_USES.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 group/item">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 group-hover/item:scale-110 transition-all duration-300"
                          style={{
                            background: "rgba(240,253,250,0.8)",
                            border: "1px solid rgba(59,130,246,0.2)",
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span className="text-slate-600 text-sm font-medium group-hover/item:text-slate-800 transition-colors duration-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4">
                    <Link href="/auth" className="w-full sm:w-auto">
                      <button
                        className="group/btn relative w-full sm:w-auto h-12 px-8 text-white font-bold rounded-xl text-sm transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
                        style={{
                          background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                          boxShadow: "0 6px 24px rgba(59,130,246,0.2)",
                        }}
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out" />
                        <span className="relative flex items-center justify-center gap-2">
                          Acessar a Central de Créditos
                          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                        </span>
                      </button>
                    </Link>
                    <p className="text-xs text-slate-400 text-center sm:text-left">
                      Entre ou crie sua conta para ver
                      <br />
                      os pacotes disponíveis.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ══════════════════════ CTA FINAL ══════════════════════ */}
      <section className="px-6 lg:px-8 pb-20 bg-white">
        <AnimatedSection>
          <div
            className="relative max-w-5xl mx-auto overflow-hidden rounded-2xl px-8 py-10 md:px-12 md:py-12 flex flex-col md:flex-row md:items-center gap-8 md:gap-12"
            style={{ background: "linear-gradient(135deg, #1e40af, #1e3a8a 55%, #172554)" }}
          >
            <div className="flex-1 min-w-0 text-center md:text-left">
              <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Pronto para transformar a gestão dos seus insumos?
              </h2>
              <p className="mt-3 text-base text-blue-100/80 max-w-xl mx-auto md:mx-0">
                Cadastre sua instituição para anunciar excedentes, encontrar
                materiais e negociar diretamente com outras instituições.
              </p>
            </div>
            <Link
              href="/auth"
              className="group shrink-0 self-center h-12 px-7 inline-flex items-center justify-center gap-2 rounded-xl bg-white text-blue-900 text-sm font-semibold hover:bg-blue-50 transition-colors"
            >
              Comece Gratuitamente
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </Link>
          </div>
        </AnimatedSection>
      </section>

      <Footer />
    </main>
  )
}