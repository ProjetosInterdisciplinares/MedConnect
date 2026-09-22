"use client"

import React, { ReactNode, useEffect, useState } from "react"
import servicesGetMinhaPessoaJuridica from "@/server/(GET)-minha-pessoa-juridica"
import servicesGetMeusAnuncios from "@/server/(GET)-meus-anuncios"
import { PessoaJuridica, Anuncio } from "@/types"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { 
  LogOut, 
  Store, 
  FileText, 
  SquarePlus,
  ChevronDown, 
  Inbox,
  Menu,
  X,
  ArrowRight,
  Shield
} from "lucide-react"
import Footer from "@/components/ui/Footer"
import { withAuth } from "@/lib/withAuth"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Array de links para manter o código limpo (DRY)
const NAV_LINKS = [
  { name: "Catálogo", href: "/catalogo", icon: Store },
  { name: "Cadastro", href: "/cadastrar", icon: FileText },
  { name: "Publicar Anúncio", href: "/anunciar", icon: SquarePlus },
  { name: "Caixa de propostas", href: "/caixa-de-propostas", icon: Inbox },
  { name: "Painel Administrativo", href: "/admin-painel/credenciamentos", icon: Shield, isAdminOnly: true },
]

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [empresa, setEmpresa] = useState<PessoaJuridica | null>(null)
  const [hasPendingProposals, setHasPendingProposals] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Scroll listener para efeito da navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Carrega a empresa
  useEffect(() => {
    async function carregarDados() {
      // 1. Carrega o usuário logado
      const result = await servicesGetMinhaPessoaJuridica()
      if (result && typeof result === "object" && !("isError" in result)) {
        setEmpresa(result as PessoaJuridica)
      }

      // 2. Carrega anúncios para verificar se há propostas recebidas (ie_status === "N")
      try {
        const anunciosResult = await servicesGetMeusAnuncios()
        let pending = false
        if (Array.isArray(anunciosResult)) {
          pending = anunciosResult.some(a => a.ie_status === "N")
        } else if ((anunciosResult as any)?.data) {
          pending = ((anunciosResult as any).data as Anuncio[]).some(a => a.ie_status === "N")
        }
        setHasPendingProposals(pending)
      } catch (e) {
        console.error("Erro ao verificar propostas", e)
      }
    }

    carregarDados()
  }, [router, pathname]) // reload on pathname change to keep notification fresh

  // Fecha o menu mobile automaticamente ao trocar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  return (
    <div className="w-full min-h-screen flex flex-col items-center text-zinc-900 font-sans antialiased scroll-smooth"
      style={{ background: "linear-gradient(160deg, #ffffff 0%, #eff6ff 25%, #eff6ff 50%, #ecfdf5 75%, #ffffff 100%)" }}
    >
      
      {/* ═══════════════ NAVBAR ═══════════════ */}
      <nav
        style={{
          height: scrolled ? "56px" : "64px",
          backgroundColor: scrolled ? "rgba(23, 37, 84, 0.95)" : "#172554",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          boxShadow: scrolled ? "0 4px 30px rgba(23, 37, 84, 0.25)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.08)",
          transition: "height 0.4s cubic-bezier(0.4,0,0.2,1), background-color 0.4s cubic-bezier(0.4,0,0.2,1), box-shadow 0.4s cubic-bezier(0.4,0,0.2,1), border-bottom 0.4s ease",
        }}
        className="w-full flex items-center justify-between px-6 md:px-10 sticky top-0 z-50"
      >

        {/* LOGO */}
        <Link href="/catalogo" className="flex items-center gap-2.5 group z-50">
          <div
            className="flex items-center justify-center rounded-xl shadow-lg group-hover:scale-105 transition-all duration-500"
            style={{
              width: scrolled ? "30px" : "34px",
              height: scrolled ? "30px" : "34px",
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              boxShadow: "0 4px 14px rgba(20, 184, 166, 0.25)",
              transition: "width 0.4s cubic-bezier(0.4,0,0.2,1), height 0.4s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <img
              src="../med-icon.svg"
              alt="MedConnect Logo"
              className="w-5 h-5 filter invert"
            />
          </div>
          <span className="font-extrabold text-xl text-white tracking-wider group-hover:text-blue-200 transition-colors duration-300">
            Med<span className="text-blue-400">Connect</span>
          </span>
        </Link>

        {/* MENU PRINCIPAL (DESKTOP) */}
        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.filter(link => !link.isAdminOnly || empresa?.is_admin).map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href

            return (
              <Link
                key={link.href}
                href={link.href}
                className="group relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 overflow-hidden"
                style={{
                  color: isActive ? "#ffffff" : "rgba(191,219,254,0.7)",
                  backgroundColor: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                }}
              >
                <span className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/10 scale-75 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 bg-blue-400 rounded-full transition-all duration-300"
                  style={{ width: isActive ? "24px" : "0px" }}
                />
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 group-hover:w-6 h-0.5 bg-blue-400 rounded-full transition-all duration-300" />
                
                <Icon size={15} className="relative z-10 group-hover:scale-110 group-hover:text-blue-300 transition-all duration-300" />
                <span className="relative z-10 group-hover:text-white transition-colors duration-300 flex items-center gap-2">
                  {link.name}
                  {link.name === "Caixa de propostas" && hasPendingProposals && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    </span>
                  )}
                </span>
              </Link>
            )
          })}
        </div>

        {/* AÇÕES DIREITA */}
        <div className="flex items-center gap-3 z-50">
          
          {/* USER MENU */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 focus:outline-none pl-1.5 pr-2 lg:pr-4 py-1.5 rounded-full transition-all duration-300 text-white border border-white/5 hover:border-white/10 active:scale-[0.98] cursor-pointer outline-none ring-0">
              <div
                className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center font-bold text-xs lg:text-sm tracking-wider text-white shadow-inner overflow-hidden border border-blue-400/30"
                style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
              >
                {empresa?.imagem_perfil ? (
                  <img src={empresa.imagem_perfil} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  empresa?.nm_pessoaj?.substring(0, 2).toUpperCase() ?? "PJ"
                )}
              </div>
              <span className="hidden lg:block text-sm font-semibold tracking-wide max-w-30 truncate text-blue-100/90">
                {empresa?.nm_pessoaj ?? "Perfil"}
              </span>
              <ChevronDown size={14} className="text-blue-200/60 transition-transform duration-300" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 bg-white rounded-2xl shadow-2xl border border-zinc-200/60 py-1.5 z-50">
              <DropdownMenuGroup>
                <DropdownMenuItem className="p-0 hover:bg-blue-50 focus:bg-blue-50 transition-colors cursor-pointer rounded-lg mx-1.5 mt-1 overflow-hidden">
                  <Link href="/perfil" className="w-full px-4 py-3 flex flex-col items-start gap-0.5 outline-none">
                    <span className="text-sm font-bold text-zinc-800">Meu Perfil</span>
                    <span className="text-xs text-zinc-400 font-medium">Configurações da conta</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="border-t border-zinc-100 my-1" />

              <DropdownMenuItem
                className="flex items-center gap-2 px-4 py-2.5 mb-1 mx-1.5 text-sm font-bold text-red-600 text-left transition-colors cursor-pointer focus:text-red-700 focus:bg-red-50 rounded-lg"
                onClick={() => {
                  import("@/lib/AuthManager").then(({ AuthManager }) => {
                    AuthManager.getInstance().logout()
                    localStorage.removeItem("cnpj")
                    router.push("/auth")
                  })
                }}
              >
                <LogOut size={16} className="text-red-500" />
                Sair do Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* BOTÃO HAMBÚRGUER (MOBILE & TABLET) */}
          <button 
            className="lg:hidden text-white p-2 hover:bg-white/10 rounded-xl transition-colors duration-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="relative w-6 h-6">
              <Menu size={24} className={`absolute inset-0 transition-all duration-300 ${isMobileMenuOpen ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"}`} />
              <X size={24} className={`absolute inset-0 transition-all duration-300 ${isMobileMenuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"}`} />
            </div>
          </button>
        </div>

        {/* MOBILE MENU OVERLAY — full-screen como na landing */}
        <div
          className={`lg:hidden fixed inset-0 top-14 z-40 transition-all duration-400 ${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          style={{ backgroundColor: "rgba(23, 37, 84, 0.98)", backdropFilter: "blur(20px)" }}
        >
          <div className={`relative flex flex-col items-center gap-2 pt-8 px-6 transition-all duration-400 ${isMobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}>
            {NAV_LINKS.filter(link => !link.isAdminOnly || empresa?.is_admin).map((link, i) => {
              const Icon = link.icon
              const isActive = pathname === link.href

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 w-full px-6 py-4 text-base font-semibold rounded-xl transition-all duration-300
                    ${isActive 
                      ? "bg-white/10 text-white" 
                      : "text-zinc-200 hover:text-white hover:bg-white/10"
                    }`}
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  <Icon size={20} className={isActive ? "text-blue-400" : "text-blue-400/60"} />
                  {link.name}
                  {link.name === "Caixa de propostas" && hasPendingProposals && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    </span>
                  )}
                  {isActive && <ArrowRight size={16} className="ml-auto text-blue-400" />}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* CONTEÚDO DA PÁGINA */}
      <main className="w-full flex-1 p-4 md:p-8 max-w-7xl">
        {children}
      </main>

      <Footer/>
    
    </div>
  )
}

export default withAuth(Layout)