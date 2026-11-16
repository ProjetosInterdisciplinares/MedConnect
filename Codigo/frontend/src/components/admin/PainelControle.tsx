"use client"

import Link from "next/link"
import { ArrowRight, Info } from "lucide-react"
import { IndicadoresControle, RankingItem } from "@/types"

const fmt = (n: number) => n.toLocaleString("pt-BR")

function formatHoras(h: number | null) {
  if (h === null) return "—"
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 48) return `${h.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`
  return `${(h / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`
}

function Indicador({ label, valor, detalhe, href }: { label: string; valor: string; detalhe?: string; href?: string }) {
  const conteudo = (
    <>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-slate-500">{detalhe}</p>}
    </>
  )
  if (href) {
    return (
      <Link href={href} className="group block p-5 hover:bg-slate-50 transition-colors">
        {conteudo}
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
          Abrir <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>
    )
  }
  return <div className="p-5">{conteudo}</div>
}

function Ranking({ titulo, descricao, itens, unidade, vazio }: {
  titulo: string
  descricao: string
  itens: RankingItem[]
  unidade: string
  vazio: string
}) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
      <p className="mt-0.5 text-xs text-slate-500">{descricao}</p>
      {itens.length === 0 ? (
        <p className="mt-6 mb-2 text-sm text-slate-400">{vazio}</p>
      ) : (
        <ol className="mt-3 divide-y divide-slate-100">
          {itens.map((item, i) => (
            <li key={item.nome} className="flex items-center gap-3 py-2.5">
              <span className="w-5 text-sm font-semibold text-slate-400 tabular-nums">{i + 1}</span>
              <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate first-letter:uppercase" title={item.nome}>
                {item.nome}
              </span>
              <span className="text-sm text-slate-600 tabular-nums whitespace-nowrap">
                {fmt(item.total)} {item.total === 1 ? unidade.replace(/s$/, "") : unidade}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function IndicadoresPrincipais({ dados }: { dados: IndicadoresControle }) {
  const respondidas = dados.propostas_aceitas + dados.propostas_recusadas
  return (
    <section aria-label="Indicadores de operação" className="bg-white rounded-xl border border-slate-200 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 divide-x divide-y xl:divide-y-0 divide-slate-200 overflow-hidden">
      <Indicador
        label="Clientes aceitos"
        valor={fmt(dados.empresas_aprovadas)}
        detalhe={`${fmt(dados.empresas_bloqueadas)} rejeitados ou bloqueados`}
      />
      <Indicador
        label="Cadastros pendentes"
        valor={fmt(dados.empresas_pendentes)}
        detalhe="Aguardando análise"
        href="/admin-painel/credenciamentos"
      />
      <Indicador
        label="Propostas"
        valor={fmt(dados.propostas_total)}
        detalhe={`${fmt(dados.propostas_pendentes)} aguardando resposta`}
      />
      <Indicador
        label="Taxa de aceite"
        valor={dados.taxa_aceite === null ? "—" : `${dados.taxa_aceite.toLocaleString("pt-BR")}%`}
        detalhe={respondidas ? `${fmt(dados.propostas_aceitas)} de ${fmt(respondidas)} respondidas` : "Nenhuma proposta respondida"}
      />
      <Indicador
        label="Tempo médio de resposta"
        valor={formatHoras(dados.tempo_medio_resposta_horas)}
        detalhe="Da proposta à resposta do vendedor"
      />
      <Indicador
        label="Anúncios vencendo"
        valor={fmt(dados.anuncios_vencendo_30d)}
        detalhe="Validade nos próximos 30 dias"
      />
    </section>
  )
}

export function RankingsControle({ dados }: { dados: IndicadoresControle }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Ranking
        titulo="Produtos mais procurados"
        descricao="Materiais com mais propostas recebidas"
        itens={dados.top_materiais_propostas}
        unidade="propostas"
        vazio="Ainda não há propostas registradas."
      />
      <Ranking
        titulo="Produtos mais anunciados"
        descricao="Materiais com mais anúncios publicados"
        itens={dados.top_materiais_anunciados}
        unidade="anúncios"
        vazio="Ainda não há anúncios publicados."
      />
      <Ranking
        titulo="Interesses das empresas"
        descricao="Termos inferidos pela IA a partir das buscas (aproximado)"
        itens={dados.top_interesses}
        unidade="empresas"
        vazio="A IA ainda não registrou interesses."
      />
    </div>
  )
}

function Numero({ label, valor, detalhe }: { label: string; valor: number; detalhe?: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{fmt(valor)}</p>
      {detalhe && <p className="mt-0.5 text-xs text-slate-500">{detalhe}</p>}
    </div>
  )
}

export function AdesaoControle({ dados, empresas, materiais }: { dados: IndicadoresControle; empresas: number; materiais: number }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="text-base font-semibold text-slate-900">Adesão e base cadastrada</h2>
      <p className="mt-0.5 text-xs text-slate-500 flex items-start gap-1">
        <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
        Acompanha o risco de baixa adesão (5W2H, R2).
      </p>
      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Numero label="Empresas na rede" valor={empresas} detalhe="Todos os status" />
        <Numero label="Materiais cadastrados" valor={materiais} />
        <Numero label="Clientes aceitos sem anúncio" valor={dados.empresas_sem_anuncio} />
        <Numero label="Créditos de boas-vindas" valor={dados.creditos_boas_vindas} detalhe={`${fmt(dados.creditos_expirados)} expiraram sem uso`} />
      </div>
    </section>
  )
}

export default function PainelControle({ dados }: { dados: IndicadoresControle }) {
  return (
    <div className="space-y-6">
      <IndicadoresPrincipais dados={dados} />
      <RankingsControle dados={dados} />
    </div>
  )
}
