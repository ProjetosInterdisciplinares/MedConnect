"use client"

import React, { ReactNode, useEffect, useState } from "react"
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
  Menu,
  X,
  ClipboardCheck,
  Handshake,
  Megaphone,
  PackagePlus,
  BarChart,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  UserRound,
} from "lucide-react"
import AppFooter from "@/components/layout/AppFooter"
import { withAuth } from "@/lib/withAuth"
import CreditosBadge from "@/components/creditos/CreditosBadge"
import SinoNotificacoes from "@/components/layout/SinoNotificacoes"
import { onCreditosAtualizados } from "@/lib/creditos"
import { NotificacoesContext } from "@/components/layout/SecaoTabs"
import { toast } from "sonner"
import { buscarSolicitacoesPendentes, onSolicitacoesAtualizadas, SolicitacaoPendente } from "@/lib/solicitacoes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type NavLink = {
  name: string
  href: string
  icon: React.ElementType
  /** Rotas que também deixam o item ativo (abas da seção). */
  match: string[]
  notificacao?: boolean
  /** Mostra o total de solicitações de credenciamento pendentes (admin). */
  solicitacoes?: boolean
  adminOnly?: boolean
}

const NAV_LINKS: NavLink[] = [
  { name: "Catálogo", href: "/catalogo", icon: Store, match: ["/catalogo"] },
  { name: "Cadastro de Insumo", href: "/cadastrar", icon: PackagePlus, match: ["/cadastrar"] },
  { name: "Anúncios", href: "/anunciar", icon: Megaphone, match: ["=/anunciar", "/anunciar-em-massa", "/meus-anuncios"] },
  { name: "Negociações", href: "/caixa-de-propostas", icon: Handshake, match: ["/caixa-de-propostas", "/minhas-negociacoes"], notificacao: true },
  { name: "Solicitações", href: "/admin-painel/credenciamentos", icon: ClipboardCheck, match: ["/admin-painel/credenciamentos"], solicitacoes: true, adminOnly: true },
  { name: "Controle", href: "/admin-painel/dashboards", icon: BarChart, match: ["/admin-painel/dashboards"], adminOnly: true },
]

const SIDEBAR_KEY = "sidebar_collapsed"
/** Aviso de solicitações pendentes: mostrado uma vez por sessão de login. */
const AVISO_SOLICITACOES_KEY = "aviso_solicitacoes_exibido"

/** Título exibido na barra superior, pelo início da rota. */
const TITULOS: [string, string][] = [
  ["/catalogo", "Catálogo"],
  ["/anunciar/", "Catálogo"], // detalhe do anúncio (/anunciar/123)
  ["/cadastrar", "Cadastro de Insumo"],
  ["/meus-anuncios", "Anúncios"],
  ["/anunciar-em-massa", "Anúncios"],
  ["/anunciar", "Anúncios"],
  ["/caixa-de-propostas", "Negociações"],
  ["/minhas-negociacoes", "Negociações"],
  ["/creditos", "Créditos"],
  ["/perfil", "Meu perfil"],
  ["/historico", "Histórico de operações"],
  ["/admin-painel/credenciamentos", "Solicitações de credenciamento"],
  ["/admin-painel/dashboards", "Controle"],
]

function tituloDaRota(pathname: string | null) {
  if (!pathname) return ""
  return TITULOS.find(([rota]) => pathname === rota || pathname.startsWith(rota.endsWith("/") ? rota : rota + "/") || (rota.endsWith("/") && pathname.startsWith(rota)))?.[1] ?? ""
}

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [empresa, setEmpresa] = useState<PessoaJuridica | null>(null)
  const [newPendingCount, setNewPendingCount] = useState(0)
  const [newAcceptedCount, setNewAcceptedCount] = useState(0)
  const [newRefusedCount, setNewRefusedCount] = useState(0)
  const [newSoldAnunciosCount, setNewSoldAnunciosCount] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPendente[]>([])

  // Limpa resquício de tema salvo caso tenha sido gravado anteriormente
  useEffect(() => {
    try {
      localStorage.removeItem("navbar_theme")
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1")
    } catch { /* storage indisponível */ }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0") } catch { /* ignore */ }
      return next
    })
  }

  // Atalho Ctrl/Cmd + B para recolher/expandir o menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault()
        toggleCollapsed()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
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

  // Solicitações de credenciamento pendentes (somente admin)
  const isAdmin = !!empresa?.is_admin
  useEffect(() => {
    if (!isAdmin) { setSolicitacoes([]); return }
    let ativo = true
    const carregar = async () => {
      const lista = await buscarSolicitacoesPendentes()
      if (ativo && lista) setSolicitacoes(lista)
      return lista
    }
    carregar().then((lista) => {
      if (!ativo || !lista || lista.length === 0) return
      try {
        if (sessionStorage.getItem(AVISO_SOLICITACOES_KEY)) return
        sessionStorage.setItem(AVISO_SOLICITACOES_KEY, "1")
      } catch { /* storage indisponível */ }
      if (window.location.pathname.startsWith("/admin-painel/credenciamentos")) return
      const n = lista.length
      toast(n === 1 ? "1 solicitação de credenciamento" : `${n} solicitações de credenciamento`, {
        description: n === 1 ? "Uma instituição aguarda sua análise." : "Instituições aguardam sua análise.",
        id: "aviso-solicitacoes",
        action: { label: "Ver", onClick: () => router.push("/admin-painel/credenciamentos") },
        duration: 8000,
      })
    })
    const intervalo = window.setInterval(carregar, 60_000)
    const desligar = onSolicitacoesAtualizadas(() => { carregar() })
    return () => { ativo = false; window.clearInterval(intervalo); desligar() }
  }, [isAdmin, pathname, router])

  // Ao abrir a tela de solicitações, o aviso já cumpriu seu papel
  useEffect(() => {
    if (pathname?.startsWith("/admin-painel/credenciamentos")) toast.dismiss("aviso-solicitacoes")
  }, [pathname])

  // Fecha o menu mobile automaticamente ao trocar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Menu mobile: Esc fecha e trava a rolagem do fundo
  useEffect(() => {
    if (!isMobileMenuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsMobileMenuOpen(false) }
    document.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
  }, [isMobileMenuOpen])

  const notificacoes = {
    recebidas: newPendingCount + newSoldAnunciosCount,
    enviadas: newAcceptedCount + newRefusedCount,
  }
  const totalNegociacoesCount = notificacoes.recebidas + notificacoes.enviadas

  // "=/rota" casa só a rota exata; as demais também casam sub-rotas
  const isLinkActive = (link: NavLink) =>
    link.match.some((rota) =>
      rota.startsWith("=") ? pathname === rota.slice(1) : pathname === rota || !!pathname?.startsWith(rota + "/")
    )

  const linksVisiveis = NAV_LINKS.filter((l) => !l.adminOnly || empresa?.is_admin)

  const logout = () => {
    AuthManager.getInstance().logout()
    localStorage.removeItem("cnpj")
    try { sessionStorage.removeItem(AVISO_SOLICITACOES_KEY) } catch { /* ignore */ }
    // Recarrega direto no login: as telas abertas não chegam a chamar a API sem token
    window.location.replace("/auth")
  }

  const tituloPagina = tituloDaRota(pathname)
  const iniciais = empresa?.nm_pessoaj?.substring(0, 2).toUpperCase() ?? "PJ"

  /* ─── Menu da conta (barra superior): perfil, créditos, sair ─── */
  const renderConta = (compacto: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-600
          ${compacto ? "p-1" : "py-1.5 pl-1.5 pr-2"}`}
        aria-label="Menu da conta"
      >
        <span className="w-8 h-8 shrink-0 rounded-full bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center text-xs font-bold text-blue-800 overflow-hidden">
          {empresa?.imagem_perfil
            ? <img src={empresa.imagem_perfil} alt="" className="w-full h-full object-cover" />
            : iniciais}
        </span>
        {!compacto && (
          <>
            <span className="max-w-[200px] text-sm font-medium text-slate-800 truncate">{empresa?.nm_pessoaj ?? "Conta"}</span>
            <ChevronDown size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" sideOffset={6} className="w-60 p-1">
        <div className="px-3 py-2">
          <p className="text-sm font-semibold text-slate-900 truncate">{empresa?.nm_pessoaj ?? "Conta"}</p>
          {empresa?.email_pj && <p className="text-xs text-slate-500 truncate">{empresa.email_pj}</p>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/perfil")} className="gap-2 px-3 py-2 cursor-pointer">
          <UserRound size={16} /> Meu perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="gap-2 px-3 py-2 cursor-pointer text-red-600 focus:text-red-700">
          <LogOut size={16} /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  /* ─── Sininho: notificações da empresa (e solicitações pendentes, para o admin) ─── */
  const renderSino = () => {
    if (!empresa) return null
    return <SinoNotificacoes isAdmin={isAdmin} solicitacoes={solicitacoes} />
  }

  const linksComuns = linksVisiveis.filter((l) => !l.adminOnly)
  const linksAdmin = linksVisiveis.filter((l) => l.adminOnly)

  /* ─── Grupo de links ("Menu", "Administração") ─── */
  const renderGrupo = (titulo: string, links: NavLink[], isCollapsed: boolean, separador: boolean) => (
    <div className="px-3">
      {isCollapsed
        ? separador && <div className="mx-2 mb-3 border-t border-slate-200" aria-hidden="true" />
        : <p className="px-3 mb-2 text-xs font-medium text-slate-400">{titulo}</p>}
      <ul className="flex flex-col gap-1">
        {links.map((link) => {
          const Icon = link.icon
          const active = isLinkActive(link)
          const count = link.notificacao ? totalNegociacoesCount : link.solicitacoes ? solicitacoes.length : 0
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                title={isCollapsed ? link.name : undefined}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-lg text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1
                  ${isCollapsed ? "justify-center h-11" : "px-3 h-11"}
                  ${active
                    ? "bg-blue-700 text-white font-semibold shadow-[0_4px_12px_-4px_rgba(29,78,216,0.55)]"
                    : "text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900"}`}
              >
                <Icon size={19} strokeWidth={active ? 2.25 : 1.9} className={`shrink-0 ${active ? "text-white" : "text-slate-500"}`} aria-hidden="true" />
                {!isCollapsed && <span className="flex-1 truncate">{link.name}</span>}
                {count > 0 && (
                  isCollapsed
                    ? <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ${active ? "ring-blue-700" : "ring-white"}`} aria-label={`${count} novidades`} />
                    : <span className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-bold tabular-nums
                        ${active ? "bg-white text-blue-800" : "bg-red-600 text-white"}`}>
                        {count > 99 ? "99+" : count}
                      </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )

  /* ─── Conteúdo do menu (desktop e gaveta mobile) ─── */
  const renderSidebar = (isCollapsed: boolean, isMobile: boolean) => (
    <div className="h-full flex flex-col bg-white text-slate-700">
      {/* Logo + recolher */}
      <div className={`h-16 shrink-0 flex items-center border-b border-slate-200 ${isCollapsed ? "justify-center" : "justify-between pl-5 pr-2"}`}>
        {!isCollapsed && (
          <Link href="/catalogo" className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-blue-700">
              <img src="/med-icon.svg" alt="" className="w-5 h-5 invert" />
            </span>
            <span className="font-bold text-lg text-slate-900 tracking-tight truncate">
              Med<span className="text-blue-700">Connect</span>
            </span>
          </Link>
        )}
        {isMobile ? (
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-md text-slate-500 hover:bg-slate-100"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-2 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            title={`${isCollapsed ? "Expandir" : "Recolher"} menu (Ctrl+B)`}
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6" aria-label="Menu principal">
        {renderGrupo("Menu", linksComuns, isCollapsed, false)}
        {linksAdmin.length > 0 && renderGrupo("Administração", linksAdmin, isCollapsed, true)}
      </nav>

    </div>
  )

  return (
    <div
      className="w-full min-h-screen bg-canvas text-main font-sans antialiased"
    >
      {/* ═══════════════ MENU LATERAL (DESKTOP) ═══════════════ */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-40 border-r border-slate-200 transition-[width] duration-200 ${collapsed ? "w-[72px]" : "w-64"}`}
      >
        {renderSidebar(collapsed, false)}
      </aside>

      {/* ═══════════════ BARRA SUPERIOR (MOBILE) ═══════════════ */}
      <header className="lg:hidden sticky top-0 z-40 h-14 flex items-center gap-2 px-3 bg-white border-b border-slate-200">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="relative p-2 rounded-md text-slate-700 hover:bg-slate-100"
          aria-label="Abrir menu"
          aria-expanded={isMobileMenuOpen}
        >
          <Menu size={22} />
          {(totalNegociacoesCount > 0 || solicitacoes.length > 0) && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>
        <p className="flex-1 min-w-0 text-base font-semibold text-slate-900 truncate">{tituloPagina || "MedConnect"}</p>
        <div className="flex items-center gap-1.5">
          {renderSino()}
          <CreditosBadge saldo={empresa?.saldo_creditos ?? null} isActive={pathname === "/creditos"} claro />
          {renderConta(true)}
        </div>
      </header>

      {/* ═══════════════ GAVETA (MOBILE) ═══════════════ */}
      <div className={`lg:hidden fixed inset-0 z-50 ${isMobileMenuOpen ? "" : "pointer-events-none"}`} aria-hidden={!isMobileMenuOpen}>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Fechar menu"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`absolute inset-0 bg-slate-950/50 transition-opacity duration-200 ${isMobileMenuOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl transition-transform duration-200 ease-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          {renderSidebar(false, true)}
        </aside>
      </div>

      {/* ═══════════════ CONTEÚDO ═══════════════ */}
      <div className={`min-h-screen flex flex-col transition-[padding] duration-200 ${collapsed ? "lg:pl-[72px]" : "lg:pl-64"}`}>
        {/* Barra superior (desktop): créditos e conta */}
        <header className="hidden lg:flex h-16 shrink-0 items-center gap-3 px-8 bg-white border-b border-slate-200">
          <p className="flex-1 min-w-0 text-lg font-semibold text-slate-900 tracking-tight truncate">{tituloPagina}</p>
          {renderSino()}
          <CreditosBadge saldo={empresa?.saldo_creditos ?? null} isActive={pathname === "/creditos"} claro />
          <span className="w-px h-6 bg-slate-200" aria-hidden="true" />
          {renderConta(false)}
        </header>
        <main className="w-full flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-7">
          <NotificacoesContext.Provider value={notificacoes}>
            {children}
          </NotificacoesContext.Provider>
        </main>
        <AppFooter />
      </div>
    </div>
  )
}

export default withAuth(Layout)
