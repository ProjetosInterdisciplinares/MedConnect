"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { createContext, Suspense, useContext } from "react"

/** Contadores de novidades calculados no layout logado. */
export type Notificacoes = { recebidas: number; enviadas: number }
export const NotificacoesContext = createContext<Notificacoes>({ recebidas: 0, enviadas: 0 })

/** `tab`: valor de ?tab= quando várias abas dividem a mesma rota; sem `tab` = aba padrão da rota. */
type Aba = { label: string; href: string; tab?: string; contador?: keyof Notificacoes }

export const SECOES = {
  // Anúncios: publicar um insumo cadastrado (um a um ou em massa), descobrir o que anunciar e acompanhar as publicações
  anuncios: [
    { label: "Publicar novo", href: "/anunciar" },
    { label: "Cadastro em massa", href: "/anunciar-em-massa" },
    { label: "Analisar estoque com IA", href: "/analisar-estoque" },
    { label: "Meus anúncios", href: "/meus-anuncios" },
  ],
  negociacoes: [
    { label: "Recebidas", href: "/caixa-de-propostas", contador: "recebidas" },
    { label: "Vendas", href: "/caixa-de-propostas", tab: "finalizados" },
    { label: "Enviadas", href: "/minhas-negociacoes", contador: "enviadas" },
  ],
} satisfies Record<string, Aba[]>

/* ─── Barra visual (reutilizada por abas de rota e de estado) ─── */
export type ItemBarra = { key: string; label: string; ativa: boolean; badge?: number; href?: string; onClick?: () => void }

export function BarraAbas({ itens, label = "Abas da seção" }: { itens: ItemBarra[]; label?: string }) {
  return (
    <nav aria-label={label} className="mb-6 border-b border-slate-200">
      <ul className="flex gap-6 -mb-px overflow-x-auto">
        {itens.map((item) => {
          const cls = `inline-flex items-center gap-2 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors
            ${item.ativa ? "border-blue-700 text-blue-800" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}`
          const conteudo = (
            <>
              {item.label}
              {!!item.badge && item.badge > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[11px] font-bold tabular-nums">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </>
          )
          return (
            <li key={item.key}>
              {item.href ? (
                <Link href={item.href} aria-current={item.ativa ? "page" : undefined} className={cls}>{conteudo}</Link>
              ) : (
                <button type="button" onClick={item.onClick} aria-current={item.ativa ? "page" : undefined} className={cls}>{conteudo}</button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function itensDaSecao(abas: Aba[], pathname: string | null, tabAtual: string | null, notificacoes: Notificacoes): ItemBarra[] {
  return abas.map((aba) => {
    const mesmaRota = pathname === aba.href
    // A aba padrão da rota fica ativa quando ?tab= não corresponde a nenhuma aba irmã
    const tabsIrmas = abas.filter((a) => a.href === aba.href && a.tab).map((a) => a.tab)
    const ativa = mesmaRota && (aba.tab ? tabAtual === aba.tab : !tabsIrmas.includes(tabAtual ?? undefined))
    return {
      key: aba.href + (aba.tab ?? ""),
      label: aba.label,
      href: aba.tab ? `${aba.href}?tab=${aba.tab}` : aba.href,
      ativa,
      badge: aba.contador ? notificacoes[aba.contador] : 0,
    }
  })
}

function SecaoTabsComBusca({ secao }: { secao: keyof typeof SECOES }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const notificacoes = useContext(NotificacoesContext)
  return <BarraAbas itens={itensDaSecao(SECOES[secao], pathname, searchParams.get("tab"), notificacoes)} />
}

function SecaoTabsSemBusca({ secao }: { secao: keyof typeof SECOES }) {
  const pathname = usePathname()
  const notificacoes = useContext(NotificacoesContext)
  return <BarraAbas itens={itensDaSecao(SECOES[secao], pathname, null, notificacoes)} />
}

/**
 * Abas de uma seção do menu (cada aba é uma rota ou uma rota + ?tab=).
 * Ex.: Anúncios → Publicar novo | Cadastro em massa | Meus anúncios.
 */
export default function SecaoTabs({ secao }: { secao: keyof typeof SECOES }) {
  return (
    <Suspense fallback={<SecaoTabsSemBusca secao={secao} />}>
      <SecaoTabsComBusca secao={secao} />
    </Suspense>
  )
}
