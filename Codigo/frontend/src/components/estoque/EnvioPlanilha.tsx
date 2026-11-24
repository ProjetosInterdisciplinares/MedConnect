"use client"

import React, { useCallback, useState } from "react"
import { AlertTriangle, Coins, Download, FileSpreadsheet, HelpCircle, Info, Loader2, Sparkles, Upload } from "lucide-react"
import { ModalPadrao, BOTAO } from "@/components/ui/modal-padrao"
import { HORIZONTES } from "@/components/estoque/rotulos"

export const TAMANHO_MAXIMO_MB = 30

const EXEMPLOS = [
  { tipo: "completo", nome: "exemplo_estoque_completo.xlsx", titulo: "Estoque completo", descricao: "120 dias de movimentação + saldo atual com lote, validade e valor." },
  { tipo: "erp", nome: "exemplo_exportacao_erp.xlsx", titulo: "Exportação de ERP", descricao: "Formato cru do sistema (CD_MATERIAL, OPERA_ESTO…), 90 dias, sem saldo." },
  { tipo: "alertas", nome: "exemplo_com_alertas.xlsx", titulo: "Com alertas", descricao: "Período de 10 dias, lote vencido e linhas com erro, para ver os avisos." },
] as const

const ETAPAS = ["Lendo a planilha…", "Calculando consumo e cobertura…", "Simulando vencimento dos lotes…", "Consultando a IA…", "Salvando no histórico…"]

interface Props {
  horizonte: number
  onHorizonte: (dias: number) => void
  analisando: boolean
  etapa: number
  custo: string
  custoAnuncio: string
  onArquivo: (arquivo: File) => void
  onBaixar: (caminho: string, nome: string) => void
  baixando: string | null
}

export default function EnvioPlanilha({ horizonte, onHorizonte, analisando, etapa, custo, custoAnuncio, onArquivo, onBaixar, baixando }: Props) {
  const [arrastando, setArrastando] = useState(false)
  const [tutorial, setTutorial] = useState(false)

  const aoArrastar = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setArrastando(e.type === "dragenter" || e.type === "dragover")
  }, [])

  function aoSoltar(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setArrastando(false)
    const arquivo = e.dataTransfer.files?.[0]
    if (arquivo && !analisando) onArquivo(arquivo)
  }

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles size={20} className="text-blue-700" aria-hidden="true" /> Analisar estoque com IA
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          A IA identifica itens que saem pouco, sobram ou vão vencer sem uso e sugere quanto anunciar de cada um.
        </p>
      </div>

      {/* Passo 1 */}
      <div className="mb-8">
        <Passo numero={1} titulo="Prepare a planilha" />
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                <FileSpreadsheet size={24} className="text-blue-900" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">modelo_analise_estoque.xlsx</p>
                <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                  Movimentações (material, data, tipo e quantidade) e, se possível, o saldo atual por lote com validade.
                  A exportação do seu ERP também é aceita.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => setTutorial(true)} className="px-4 py-2.5 text-sm font-bold text-blue-900 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2 cursor-pointer">
                <HelpCircle size={16} aria-hidden="true" /> Como preencher
              </button>
              <button
                type="button"
                onClick={() => onBaixar("modelo/", "modelo_analise_estoque.xlsx")}
                disabled={baixando === "modelo/"}
                className="px-4 py-2.5 text-sm font-bold text-white bg-blue-900 rounded-xl hover:bg-blue-950 transition-colors shadow-md shadow-blue-900/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {baixando === "modelo/" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                Baixar modelo
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs font-semibold text-slate-600 mt-4 mb-2">Planilhas de exemplo para testar</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {EXEMPLOS.map((ex) => {
            const caminho = `exemplo/${ex.tipo}/`
            return (
              <button
                key={ex.tipo}
                type="button"
                onClick={() => onBaixar(caminho, ex.nome)}
                disabled={baixando === caminho}
                className="text-left rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer disabled:opacity-60"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">{ex.titulo}</span>
                  {baixando === caminho
                    ? <Loader2 size={14} className="animate-spin text-slate-400" aria-hidden="true" />
                    : <Download size={14} className="text-slate-400" aria-hidden="true" />}
                </span>
                <span className="block text-xs text-slate-500 mt-1">{ex.descricao}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Passo 2 */}
      <div className="mb-8">
        <Passo numero={2} titulo="Escolha o horizonte de planejamento" />
        <fieldset>
          <legend className="text-xs text-slate-500 mb-3">
            A sugestão mantém em estoque o consumo previsto para este período (com 20% de margem) e anuncia o que passar disso.
          </legend>
          <div className="grid grid-cols-3 gap-2 max-w-lg">
            {HORIZONTES.map((h) => (
              <label
                key={h.dias}
                className={`rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                  horizonte === h.dias ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input type="radio" name="horizonte" value={h.dias} checked={horizonte === h.dias} onChange={() => onHorizonte(h.dias)} className="sr-only" />
                <span className={`block text-sm font-bold ${horizonte === h.dias ? "text-blue-900" : "text-slate-700"}`}>{h.rotulo}</span>
                <span className="block text-[11px] text-slate-500">{h.descricao}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Passo 3 */}
      <div>
        <Passo numero={3} titulo="Envie a planilha" />
        <label
          className={`flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-2xl transition-all group ${
            analisando
              ? "border-blue-300 bg-blue-50/30 cursor-wait"
              : arrastando
                ? "border-blue-500 bg-blue-50/50 scale-[1.01] cursor-pointer"
                : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-400 cursor-pointer"
          }`}
          onDragEnter={aoArrastar}
          onDragLeave={aoArrastar}
          onDragOver={aoArrastar}
          onDrop={aoSoltar}
        >
          {analisando ? (
            <div className="flex flex-col items-center gap-3 px-4 text-center" role="status" aria-live="polite">
              <Loader2 size={40} className="text-blue-900 animate-spin" aria-hidden="true" />
              <p className="text-sm font-bold text-blue-900">{ETAPAS[Math.min(etapa, ETAPAS.length - 1)]}</p>
              <p className="text-xs text-slate-500">Planilhas grandes podem levar até 1 minuto. Não feche esta página.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
              <div className="w-14 h-14 mb-4 bg-white shadow-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload size={24} className="text-blue-900" aria-hidden="true" />
              </div>
              <p className="mb-1 text-sm text-slate-600 font-semibold">{arrastando ? "Solte o arquivo aqui" : "Clique ou arraste a planilha de estoque"}</p>
              <p className="text-xs text-slate-500">Arquivo .xlsx ou .csv (até {TAMANHO_MAXIMO_MB} MB)</p>
            </div>
          )}
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.xlsm,.csv"
            disabled={analisando}
            onChange={(e) => {
              const arquivo = e.target.files?.[0]
              e.target.value = ""
              if (arquivo) onArquivo(arquivo)
            }}
          />
        </label>
        <div className="mt-3 space-y-1.5 text-sm text-slate-500">
          <p className="flex items-start gap-1.5">
            <Coins size={15} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>A análise usa <span className="font-semibold text-slate-700">{custo}</span>, cobrados só se a IA responder.</span>
          </p>
          <p className="flex items-start gap-1.5">
            <Info size={15} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Publicar os anúncios sugeridos é à parte: <span className="font-semibold text-slate-700">{custoAnuncio} por anúncio</span>,
              só dos que você escolher. A análise fica salva para você voltar e publicar o restante depois.
            </span>
          </p>
        </div>
      </div>

      <ModalPadrao
        open={tutorial}
        onOpenChange={setTutorial}
        largura="xl"
        titulo="Como preencher a planilha"
        descricao="Uma linha por movimentação. Colunas com * são obrigatórias."
        acoes={<button type="button" onClick={() => setTutorial(false)} className={BOTAO.secundario}>Entendi</button>}
      >
        <TutorialPlanilha />
      </ModalPadrao>
    </div>
  )
}

function Passo({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-sm font-black" aria-hidden="true">{numero}</div>
      <h3 className="font-bold text-slate-800">{titulo}</h3>
    </div>
  )
}

function TutorialPlanilha() {
  const movimentacoes = [
    ["Descrição do Material *", "Nome do material ou medicamento, igual ao do seu sistema."],
    ["Data da Movimentação *", "DD/MM/AAAA ou data do Excel."],
    ["Tipo de Movimentação *", "Use a lista do modelo ou o texto do seu ERP (ex.: “Saída - Dispensação por Prescrição”)."],
    ["Quantidade *", "Quantidade movimentada, na unidade de consumo."],
    ["Código do Material", "Recomendado: identifica o item mesmo que a descrição mude."],
    ["Unidade, Lote, Data de Validade", "Opcionais. A validade das entradas melhora o cálculo de vencimento."],
  ]
  const saldo = [
    ["Saldo Atual *", "Quantidade em estoque hoje, uma linha por lote."],
    ["Data de Validade", "Permite prever o que vai vencer antes de ser usado."],
    ["Valor Unitário (R$)", "Permite estimar o valor parado em estoque."],
  ]
  return (
    <div className="space-y-5 text-sm">
      <TabelaCampos titulo="Aba “Movimentações”" campos={movimentacoes} />
      <TabelaCampos titulo="Aba “Saldo Atual” (opcional, recomendada)" campos={saldo} />
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-600" aria-hidden="true" /> Para uma boa análise
        </h4>
        <ul className="space-y-1.5 text-xs text-slate-600">
          <li>• Envie de 3 a 6 meses de movimentação. Menos de 60 dias gera alerta de período curto.</li>
          <li>• Transferências entre almoxarifado e farmácia satélite não contam como consumo.</li>
          <li>• Sem a aba de saldo, o saldo é estimado por entradas menos saídas do período.</li>
          <li>• Itens com estoque para menos de 15 dias nunca são sugeridos e geram alerta.</li>
          <li className="flex gap-1"><Info size={12} className="shrink-0 mt-0.5" aria-hidden="true" /> Toda análise fica salva: você pode voltar e ver como o estoque estava.</li>
        </ul>
      </div>
    </div>
  )
}

function TabelaCampos({ titulo, campos }: { titulo: string; campos: string[][] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900 mb-2">{titulo}</h4>
      <dl className="rounded-lg border border-slate-200 divide-y divide-slate-100">
        {campos.map(([campo, explicacao]) => (
          <div key={campo} className="px-3 py-2.5">
            <dt className="text-sm font-medium text-slate-900">{campo}</dt>
            <dd className="text-xs text-slate-500">{explicacao}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
