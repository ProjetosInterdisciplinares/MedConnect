"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, BellRing, ClipboardCheck, Coins, Handshake } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import servicesGetNotificacoes from "@/server/(GET)-notificacoes"
import servicesMarcarTodasLidas, { servicesMarcarNotificacaoLida } from "@/server/(POST)-notificacoes-lidas"
import { SolicitacaoPendente } from "@/lib/solicitacoes"
import { Notificacao, TipoNotificacao } from "@/types"

const INTERVALO_ATUALIZACAO_MS = 60_000

const ICONE: Record<TipoNotificacao, typeof Bell> = {
  CREDENCIAMENTO: ClipboardCheck,
  NEGOCIACAO: Handshake,
  ALERTA: BellRing,
  CREDITOS: Coins,
}

function destino(n: Notificacao, isAdmin: boolean): string {
  switch (n.tipo) {
    case "NEGOCIACAO": return "/caixa-de-propostas"
    case "ALERTA": return "/catalogo"
    case "CREDITOS": return "/creditos"
    default: return isAdmin ? "/admin-painel/credenciamentos" : "/perfil"
  }
}

function tempoRelativo(iso: string): string {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutos < 1) return "agora"
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  return new Date(iso).toLocaleDateString("pt-BR")
}

type Props = {
  isAdmin: boolean
  solicitacoes: SolicitacaoPendente[]
}

export default function SinoNotificacoes({ isAdmin, solicitacoes }: Props) {
  const router = useRouter()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)

  const carregar = useCallback(async () => {
    const resposta = await servicesGetNotificacoes()
    if ("isError" in resposta) return
    setNotificacoes(resposta.notificacoes)
    setNaoLidas(resposta.nao_lidas)
  }, [])

  useEffect(() => {
    carregar()
    const intervalo = window.setInterval(carregar, INTERVALO_ATUALIZACAO_MS)
    return () => window.clearInterval(intervalo)
  }, [carregar])

  async function abrir(n: Notificacao) {
    if (!n.lida) {
      setNotificacoes((atual) => atual.map((x) => (x.id === n.id ? { ...x, lida: true } : x)))
      setNaoLidas((total) => Math.max(0, total - 1))
      servicesMarcarNotificacaoLida(n.id)
    }
    router.push(destino(n, isAdmin))
  }

  async function marcarTodas() {
    setNotificacoes((atual) => atual.map((x) => ({ ...x, lida: true })))
    setNaoLidas(0)
    await servicesMarcarTodasLidas()
  }

  const pendentes = isAdmin ? solicitacoes.length : 0
  const total = naoLidas + pendentes
  const recentes = notificacoes.slice(0, 8)

  return (
    <DropdownMenu onOpenChange={(aberto) => { if (aberto) carregar() }}>
      <DropdownMenuTrigger
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        aria-label={total > 0 ? `Notificações: ${total} novas` : "Notificações"}
      >
        <Bell size={20} aria-hidden="true" />
        {total > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white tabular-nums ring-2 ring-white">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="end" sideOffset={6} className="w-80 p-0 overflow-hidden">
        {isAdmin && (
          <>
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">Solicitações de credenciamento</p>
              <p className="text-xs text-slate-500">
                {pendentes === 0 ? "Nenhuma solicitação aguardando análise." : pendentes === 1 ? "1 instituição aguarda análise." : `${pendentes} instituições aguardam análise.`}
              </p>
            </div>
            {solicitacoes.slice(0, 3).map((s) => (
              <DropdownMenuItem
                key={s.cd_pessoaj}
                onClick={() => router.push(`/admin-painel/credenciamentos?empresa=${s.cd_pessoaj}`)}
                className="flex items-start gap-3 px-4 py-2.5 cursor-pointer rounded-none"
              >
                <span className="mt-0.5 w-8 h-8 shrink-0 rounded-full bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-800">
                  {s.nm_pessoaj.substring(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900 truncate">{s.nm_pessoaj}</span>
                  <span className="block text-xs text-slate-500 truncate tabular-nums">
                    {s.nr_cnpj}{s.cidade ? ` · ${s.cidade}${s.estado ? `/${s.estado}` : ""}` : ""}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
            {pendentes > 0 && (
              <DropdownMenuItem
                onClick={() => router.push("/admin-painel/credenciamentos")}
                className="justify-center px-4 py-2 text-sm font-semibold text-blue-700 cursor-pointer rounded-none"
              >
                {pendentes > 3 ? `Ver todas (${pendentes})` : "Abrir solicitações"}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="m-0" />
          </>
        )}

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">Notificações</p>
          {naoLidas > 0 && (
            <button type="button" onClick={marcarTodas} className="text-xs font-semibold text-blue-700 hover:text-blue-800">
              Marcar todas como lidas
            </button>
          )}
        </div>

        {recentes.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            Nenhuma notificação por enquanto. Avisos sobre propostas, alertas de interesse e créditos aparecem aqui.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto py-1">
            {recentes.map((n) => {
              const Icone = ICONE[n.tipo] ?? Bell
              return (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => abrir(n)}
                  className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer rounded-none ${n.lida ? "" : "bg-blue-50/60"}`}
                >
                  <Icone size={16} className={`mt-0.5 shrink-0 ${n.lida ? "text-slate-400" : "text-blue-700"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm leading-snug ${n.lida ? "text-slate-600" : "text-slate-900 font-medium"}`}>{n.mensagem}</span>
                    <span className="block mt-0.5 text-xs text-slate-500">{n.tipo_display} · {tempoRelativo(n.criada_em)}</span>
                  </span>
                  {!n.lida && <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-blue-600" aria-label="Não lida" />}
                </DropdownMenuItem>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
