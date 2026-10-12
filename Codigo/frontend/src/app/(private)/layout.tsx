"use client"

import React, { ReactNode, useEffect, useRef, useState } from "react"
import servicesGetMinhaPessoaJuridica from "@/server/(GET)-minha-pessoa-juridica"
import servicesGetMeusAnuncios from "@/server/(GET)-meus-anuncios"
import servicesGetNegociacoes from "@/server/(GET)-negociacoes"
import { AuthManager } from "@/lib/AuthManager"
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
  Shield,
  Handshake,
  Megaphone,
  Package,
  BarChart
} from "lucide-react"
import Footer from "@/components/ui/Footer"
import { withAuth } from "@/lib/withAuth"
import CreditosBadge from "@/components/creditos/CreditosBadge"
import { onCreditosAtualizados } from "@/lib/creditos"

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
  { name: "Cadastrar Materiais", href: "/cadastrar", icon: FileText },
  {
    name: "Anunciar",
    href: "#",
    icon: SquarePlus,
    subLinks: [
      { name: "Publicar Anúncio", href: "/anunciar", icon: Megaphone },
      { name: "Meus Anúncios", href: "/meus-anuncios", icon: Package }
    ]
  },
  {
    name: "Negociações",
    href: "#",
    icon: Handshake,
    subLinks: [
      { name: "Minhas Negociações", href: "/minhas-negociacoes", icon: Handshake },
      { name: "Propostas Recebidas", href: "/caixa-de-propostas", icon: Inbox }
    ]
  },
  { name: "Painel Administrativo", href: "/admin-painel/credenciamentos", icon: Shield, isAdminOnly: true },
  { name: "DashBoards", href: "/admin-painel/dashboards", icon: BarChart, isAdminOnly: true },
]

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isCatalogo = pathname?.startsWith("/catalogo")

  const [empresa, setEmpresa] = useState<PessoaJuridica | null>(null)
  const [newPendingCount, setNewPendingCount] = useState(0)
  const [newAcceptedCount, setNewAcceptedCount] = useState(0)
  const [newRefusedCount, setNewRefusedCount] = useState(0)
  const [newSoldAnunciosCount, setNewSoldAnunciosCount] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null)
  const [openDesktopDropdown, setOpenDesktopDropdown] = useState<string | null>(null)
  const desktopDropdownRef = useRef<HTMLDivElement>(null)

  // Limpa resquício de tema salvo caso tenha sido gravado anteriormente
  useEffect(() => {
    localStorage.removeItem("navbar_theme")
  }, [])

  // Click outside handler for desktop dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(e.target as Node)) {
        setOpenDesktopDropdown(null)
      }
    }
    if (openDesktopDropdown) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [openDesktopDropdown])

  // Scroll listener para efeito da navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Listener para sincronização de saldo
  useEffect(() => {
    return onCreditosAtualizados((novoSaldo) => {
      setEmpresa((prev) => prev ? { ...prev, saldo_creditos: novoSaldo } : null)
    })
  }, [])

  // Carrega a empresa
  useEffect(() => {
    async function carregarDados() {
      // 1. Carrega o usuário logado
      const result = await servicesGetMinhaPessoaJuridica()
      if (result && typeof result === "object" && !("isError" in result)) {
        setEmpresa(result as PessoaJuridica)
      }

      // 2. Carrega anúncios e negociações para verificar notificações
      try {
        const [anunciosResult, negociacoesResult] = await Promise.all([
          servicesGetMeusAnuncios(),
          servicesGetNegociacoes()
        ])

        const myUserId = Number(AuthManager.getInstance().getUserId())

        let pendingIds = ""
        let soldIds = ""

        // Sold Anuncios: mantemos buscando os Anúncios ("F")
        if (Array.isArray(anunciosResult)) {
          soldIds = anunciosResult.filter(a => a.ie_status === "F").map(a => a.nr_anuncio).join(',')
        } else if ((anunciosResult as any)?.data) {
          soldIds = ((anunciosResult as any).data as Anuncio[]).filter(a => a.ie_status === "F").map(a => a.nr_anuncio).join(',')
        }

        // Pendentes: Negociações que EU recebi ("P")
        let negociacoesList: any[] = []
        if (Array.isArray(negociacoesResult)) {
          negociacoesList = negociacoesResult
        } else if ((negociacoesResult as any)?.data) {
          negociacoesList = (negociacoesResult as any).data
        }

        pendingIds = negociacoesList.filter(n => n.vendedor === myUserId && n.status === "P").map(n => String(n.id)).join(',')

        const currentPendingIds = pendingIds ? pendingIds.split(',') : []
        const currentSoldIds = soldIds ? soldIds.split(',') : []

        const seenPending = localStorage.getItem('seen_pending_proposals') ? localStorage.getItem('seen_pending_proposals')!.split(',') : []
        const seenSold = localStorage.getItem('seen_sold_anuncios') ? localStorage.getItem('seen_sold_anuncios')!.split(',') : []

        const newPendingList = currentPendingIds.filter(id => !seenPending.includes(id))
        const newSoldList = currentSoldIds.filter(id => !seenSold.includes(id))

        if (pathname === '/caixa-de-propostas') {
          const newSeen = Array.from(new Set([...seenPending, ...currentPendingIds])).filter(Boolean).join(',')
          const newSeenSold = Array.from(new Set([...seenSold, ...currentSoldIds])).filter(Boolean).join(',')
          localStorage.setItem('seen_pending_proposals', newSeen)
          localStorage.setItem('seen_sold_anuncios', newSeenSold)
          setNewPendingCount(0)
          setNewSoldAnunciosCount(0)
        } else {
          setNewPendingCount(newPendingList.length)
          setNewSoldAnunciosCount(newSoldList.length)
        }

        // Verifica compras finalizadas (negociações enviadas aceitas ou recusadas)
        let acceptedIds = negociacoesList.filter(n => n.comprador === myUserId && n.status === "A").map(n => String(n.id)).join(',')
        let refusedIds = negociacoesList.filter(n => n.comprador === myUserId && (n.status === "R" || n.status === "C")).map(n => String(n.id)).join(',')

        const currentAcceptedIds = acceptedIds ? acceptedIds.split(',') : []
        const currentRefusedIds = refusedIds ? refusedIds.split(',') : []

        const seenAccepted = localStorage.getItem('seen_accepted_negotiations') ? localStorage.getItem('seen_accepted_negotiations')!.split(',') : []
        const seenRefused = localStorage.getItem('seen_refused_negotiations') ? localStorage.getItem('seen_refused_negotiations')!.split(',') : []

        const newAcceptedList = currentAcceptedIds.filter(id => !seenAccepted.includes(id))
        const newRefusedList = currentRefusedIds.filter(id => !seenRefused.includes(id))

        if (pathname === '/minhas-negociacoes') {
          const newSeenAccepted = Array.from(new Set([...seenAccepted, ...currentAcceptedIds])).filter(Boolean).join(',')
          const newSeenRefused = Array.from(new Set([...seenRefused, ...currentRefusedIds])).filter(Boolean).join(',')
          localStorage.setItem('seen_accepted_negotiations', newSeenAccepted)
          localStorage.setItem('seen_refused_negotiations', newSeenRefused)
          setNewAcceptedCount(0)
          setNewRefusedCount(0)
        } else {
          setNewAcceptedCount(newAcceptedList.length)
          setNewRefusedCount(newRefusedList.length)
        }
      } catch (e) {
        console.error("Erro ao verificar propostas e compras", e)
      }
    }

    carregarDados()
  }, [router, pathname]) // reload on pathname change to keep notification fresh

  // Fecha o menu mobile automaticamente ao trocar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const getSubLinkNotificationCount = (subName: string) => {
    if (subName === "Minhas Negociações") return newAcceptedCount + newRefusedCount
    if (subName === "Propostas Recebidas") return newPendingCount + newSoldAnunciosCount
    return 0
  }

  const getLinkNotificationCount = (link: (typeof NAV_LINKS)[number]) => {
    if (link.subLinks) {
      return link.subLinks.reduce((acc, sub) => acc + getSubLinkNotificationCount(sub.name), 0)
    }
    return 0
  }

  const totalNegociacoesCount =
    newAcceptedCount + newRefusedCount + newPendingCount + newSoldAnunciosCount

  const renderNotificationBadge = (count: number, className = "") => {
    if (count <= 0) return null
    return (
      <span
        className={`inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[11px] font-black leading-none text-white bg-red-600 rounded-full shadow-sm shadow-red-950/40 select-none ${className}`}
      >
        {count > 99 ? "99+" : count}
      </span>
    )
  }

  return (
    <div
      className={`w-full min-h-screen flex flex-col items-center text-main font-sans antialiased scroll-smooth ${isCatalogo
        ? "bg-canvas"
        : ""
        }`}
      style={
        isCatalogo
          ? undefined
          : { background: "linear-gradient(160deg, #ffffff 0%, #eff6ff 25%, #eff6ff 50%, #ecfdf5 75%, #ffffff 100%)" }
      }
    >

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <nav
        style={{
          height: "64px",
          backgroundColor: scrolled ? "rgba(23, 37, 84, 0.95)" : "var(--brand-navy)",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          boxShadow: scrolled ? "0 4px 30px rgba(23, 37, 84, 0.25)" : "none",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          transition: "height 0.4s cubic-bezier(0.4,0,0.2,1), background-color 0.4s cubic-bezier(0.4,0,0.2,1), box-shadow 0.4s cubic-bezier(0.4,0,0.2,1), border-bottom 0.4s ease",
        }}
        className="w-full flex items-center justify-between px-3 sm:px-6 md:px-10 sticky top-0 z-50"
      >

        {/* LOGO */}
        <Link href="/catalogo" className="flex items-center gap-2.5 group z-50">
          <div
            className="flex items-center justify-center rounded-xl shadow-lg group-hover:scale-105 transition-all duration-500"
            style={{
              width: "34px",
              height: "34px",
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
          <span className="font-extrabold text-lg sm:text-xl tracking-wider transition-colors duration-300 text-white">
            Med<span className="text-brand-accent">Connect</span>
          </span>
        </Link>

        {/* MENU PRINCIPAL (DESKTOP) */}
        <div className="hidden xl:flex items-center gap-1">
          {NAV_LINKS.filter(link => !link.isAdminOnly || empresa?.is_admin).map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href || link.subLinks?.some(sub => pathname === sub.href.split('?')[0])

            if (link.subLinks) {
              const isDropdownOpen = openDesktopDropdown === link.name
              return (
                <div key={link.name} className="relative" ref={isDropdownOpen ? desktopDropdownRef : undefined}>
                  <button
                    type="button"
                    onClick={() => setOpenDesktopDropdown(isDropdownOpen ? null : link.name)}
                    className={`group relative flex items-center gap-1.5 2xl:gap-2 px-2.5 2xl:px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 overflow-hidden outline-none cursor-pointer whitespace-nowrap ${isActive || isDropdownOpen
                      ? "text-white bg-white/10"
                      : "text-blue-200/70 hover:text-white"
                      }`}
                  >
                    <span className="absolute inset-0 rounded-full scale-75 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/10" />
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300 bg-blue-400" style={{ width: isActive ? "24px" : "0px" }} />
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 group-hover:w-6 h-0.5 rounded-full transition-all duration-300 bg-blue-400" />

                    <Icon size={15} className={`relative z-10 shrink-0 group-hover:scale-110 transition-all duration-300 ${isActive || isDropdownOpen ? "text-white" : "group-hover:text-blue-300"}`} />
                    <span className="relative z-10 transition-colors duration-300 flex items-center gap-1.5">
                      <span>{link.name}</span>
                      {renderNotificationBadge(getLinkNotificationCount(link))}
                      <ChevronDown size={14} className={`ml-0.5 shrink-0 transition-all duration-300 ${isDropdownOpen ? "rotate-180 text-blue-400" : "opacity-70 group-hover:opacity-100"}`} />
                    </span>
                  </button>

                  {/* Expanding panel */}
                  <div
                    className="absolute top-full left-0 mt-1.5 min-w-full w-auto z-50 transition-all duration-200 origin-top"
                    style={{
                      opacity: isDropdownOpen ? 1 : 0,
                      transform: `scaleY(${isDropdownOpen ? 1 : 0.95})`,
                      pointerEvents: isDropdownOpen ? "auto" : "none",
                    }}
                  >
                    <div className="rounded-xl border border-white/10 p-1 overflow-hidden bg-brand-navy shadow-[0_6px_20px_rgba(15,23,42,0.4)]">
                      {link.subLinks.map(sub => {
                        const SubIcon = sub.icon
                        const subCount = getSubLinkNotificationCount(sub.name)
                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            onClick={() => setOpenDesktopDropdown(null)}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 whitespace-nowrap text-white/90 hover:bg-white/10"
                          >
                            <div className="flex items-center gap-2.5">
                              <SubIcon size={15} className="shrink-0 text-blue-300" strokeWidth={2} />
                              <span className="text-[13px] font-semibold leading-tight">
                                {sub.name}
                              </span>
                            </div>
                            {renderNotificationBadge(subCount, "ml-2")}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative flex items-center gap-1.5 2xl:gap-2 px-2.5 2xl:px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 overflow-hidden whitespace-nowrap ${isActive
                  ? "text-white bg-white/10"
                  : "text-blue-200/70 hover:text-white"
                  }`}
              >
                <span className="absolute inset-0 rounded-full scale-75 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/10" />
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300 bg-blue-400"
                  style={{ width: isActive ? "24px" : "0px" }}
                />
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 group-hover:w-6 h-0.5 rounded-full transition-all duration-300 bg-blue-400" />

                <Icon size={15} className={`relative z-10 shrink-0 group-hover:scale-110 transition-all duration-300 ${isActive ? "text-white" : "group-hover:text-blue-300"}`} />
                <span className="relative z-10 transition-colors duration-300 flex items-center gap-2">
                  {link.name}
                </span>
              </Link>
            )
          })}
        </div>

        {/* AÇÕES DIREITA */}
        <div className="flex items-center gap-1.5 sm:gap-3 z-50">

          <CreditosBadge saldo={empresa?.saldo_creditos ?? null} />

          {/* USER MENU */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1 sm:gap-2.5 focus:outline-none p-1 sm:pl-1.5 sm:pr-2 lg:pr-4 sm:py-1.5 rounded-full transition-all duration-300 bg-white/10 hover:bg-white/15 border border-white/5 active:scale-[0.98] cursor-pointer outline-none ring-0"
            >
              <div
                className="w-7 h-7 lg:w-8 lg:h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-xs lg:text-sm tracking-wider text-white shadow-inner overflow-hidden border border-blue-400/30"
                style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
              >
                {empresa?.imagem_perfil ? (
                  <img src={empresa.imagem_perfil} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  empresa?.nm_pessoaj?.substring(0, 2).toUpperCase() ?? "PJ"
                )}
              </div>
              <span className="hidden xl:block text-sm font-semibold tracking-wide text-blue-100/90 max-w-30 truncate">
                {empresa?.nm_pessoaj ?? "Perfil"}
              </span>
              <ChevronDown size={14} className="text-blue-200/60 transition-transform duration-300" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60 bg-surface rounded-2xl shadow-2xl border border-border/60 py-1.5 z-50">
              <DropdownMenuGroup>
                <DropdownMenuItem className="p-0 hover:bg-brand-subtle focus:bg-brand-subtle transition-colors cursor-pointer rounded-lg mx-1.5 mt-1 overflow-hidden">
                  <Link href="/perfil" className="w-full px-4 py-3 flex flex-col items-start gap-0.5 outline-none">
                    <span className="text-sm font-bold text-main">Meu Perfil</span>
                    <span className="text-xs text-subtle font-medium">Configurações da conta</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="border-t border-border-subtle my-1" />


              <DropdownMenuItem
                className="flex items-center gap-2 px-4 py-2.5 mb-1 mx-1.5 text-sm font-bold text-danger text-left transition-colors cursor-pointer focus:text-danger focus:bg-danger-subtle rounded-lg"
                onClick={() => {
                  import("@/lib/AuthManager").then(({ AuthManager }) => {
                    AuthManager.getInstance().logout()
                    localStorage.removeItem("cnpj")
                    router.push("/auth")
                  })
                }}
              >
                <LogOut size={16} className="text-danger" />
                Sair do Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* BOTÃO HAMBÚRGUER (MOBILE & TABLET) */}
          <button
            className="xl:hidden relative p-1 sm:p-2 rounded-xl text-white hover:bg-white/10 transition-colors duration-300 cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
              <Menu className={`absolute inset-0 w-full h-full transition-all duration-300 ${isMobileMenuOpen ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"}`} />
              <X className={`absolute inset-0 w-full h-full transition-all duration-300 ${isMobileMenuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"}`} />
            </div>
            {totalNegociacoesCount > 0 && !isMobileMenuOpen && (
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* MOBILE MENU OVERLAY — full-screen como na landing */}
      <div
        className={`xl:hidden fixed inset-0 z-40 transition-all duration-400 ${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ backgroundColor: "rgba(23, 37, 84, 0.98)", backdropFilter: "blur(20px)" }}
      >
        <div className="relative flex flex-col items-center gap-2 pt-20 pb-24 px-6 transition-all duration-400 overflow-y-auto h-full w-full">
          {NAV_LINKS.filter(link => !link.isAdminOnly || empresa?.is_admin).map((link, i) => {
            const Icon = link.icon
            const isActive = pathname === link.href || link.subLinks?.some(sub => pathname === sub.href.split('?')[0])

            if (link.subLinks) {
              const isMobileDropdownOpen = openMobileDropdown === link.name
              return (
                <div key={link.name} className="w-full" style={{ transitionDelay: `${i * 50}ms` }}>
                  <button
                    type="button"
                    onClick={() => setOpenMobileDropdown(isMobileDropdownOpen ? null : link.name)}
                    className={`flex items-center gap-3 w-full px-6 py-4 text-base font-semibold rounded-xl transition-all duration-300 cursor-pointer ${isActive
                      ? "bg-white/10 text-white"
                      : "text-zinc-200 hover:text-white hover:bg-white/10"
                      }`}
                  >
                    <Icon size={20} className={isActive ? "text-blue-400" : "text-blue-400/60"} />
                    <span>{link.name}</span>
                    {renderNotificationBadge(getLinkNotificationCount(link), "ml-2")}
                    <ChevronDown size={16} className={`ml-auto transition-transform duration-300 ${isMobileDropdownOpen ? "rotate-180 text-blue-400" : "text-zinc-400"}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isMobileDropdownOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="flex flex-col gap-1 pl-4 py-2">
                      {link.subLinks.map(sub => {
                        const SubIcon = sub.icon
                        const isSubActive = pathname === sub.href.split('?')[0]
                        const subCount = getSubLinkNotificationCount(sub.name)
                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center justify-between gap-3 w-full px-6 py-3 text-[15px] font-semibold rounded-xl transition-all duration-200 ${isSubActive
                              ? "bg-white/10 text-white"
                              : "text-zinc-300 hover:text-white hover:bg-white/5"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                <SubIcon size={16} className="text-blue-300" />
                              </div>
                              <span>{sub.name}</span>
                            </div>
                            {renderNotificationBadge(subCount, "mr-2")}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 w-full px-6 py-4 text-base font-semibold rounded-xl transition-all duration-300 ${isActive
                  ? "bg-white/10 text-white"
                  : "text-zinc-200 hover:text-white hover:bg-white/10"
                  }`}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <Icon size={20} className={isActive ? "text-blue-400" : "text-blue-400/60"} />
                {link.name}
                {isActive && <ArrowRight size={16} className="ml-auto text-blue-400" />}
              </Link>
            )
          })}
        </div>
      </div>

      {/* CONTEÚDO DA PÁGINA */}
      <main className={`w-full flex-1 ${isCatalogo ? "p-0 max-w-none" : "p-4 md:p-8 max-w-7xl"}`}>
        {children}
      </main>

      <Footer />

    </div>
  )
}

export default withAuth(Layout)