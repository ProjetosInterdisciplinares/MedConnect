"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertOctagon, AlertTriangle } from "lucide-react"
import EnvioPlanilha, { TAMANHO_MAXIMO_MB } from "@/components/estoque/EnvioPlanilha"
import HistoricoAnalises from "@/components/estoque/HistoricoAnalises"
import ResultadoAnalise from "@/components/estoque/ResultadoAnalise"
import ConfigurarAnuncios from "@/components/estoque/ConfigurarAnuncios"
import { fmtDataHora, fmtTamanho, HORIZONTES } from "@/components/estoque/rotulos"
import { AvisoDialog, BOTAO, ConfirmarDialog, ModalPadrao, Resumo } from "@/components/ui/modal-padrao"
import { rotuloCreditos, useCustosCreditos } from "@/hooks/useCustosCreditos"
import { notificarCreditosAtualizados } from "@/lib/creditos"
import servicesAnalisarEstoque from "@/server/(POST)-analise-estoque"
import servicesGetAnalisesEstoque, { servicesGetAnaliseEstoque } from "@/server/(GET)-analises-estoque"
import servicesDeleteAnaliseEstoque from "@/server/(DELETE)-analise-estoque"
import servicesBaixarArquivoEstoque from "@/server/(GET)-arquivo-estoque"
import servicesGetCreditosSaldo from "@/server/(GET)-creditos-saldo"
import { AlertaEstoque, AnaliseEstoque as Analise, ResumoAnaliseEstoque } from "@/types"

const EXTENSOES = [".xlsx", ".xlsm", ".csv"]

export default function AnaliseEstoque() {
  const router = useRouter()
  const custos = useCustosCreditos()
  const custo = rotuloCreditos(custos.analiseEstoque)
  const custoAnuncio = rotuloCreditos(custos.publicacao)

  const [horizonte, setHorizonte] = useState(180)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [analisando, setAnalisando] = useState(false)
  const [etapa, setEtapa] = useState(0)
  const [analise, setAnalise] = useState<Analise | null>(null)
  const [configurando, setConfigurando] = useState(false)

  const [historico, setHistorico] = useState<ResumoAnaliseEstoque[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(true)
  const [abrindo, setAbrindo] = useState<number | null>(null)
  const [excluir, setExcluir] = useState<ResumoAnaliseEstoque | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [baixando, setBaixando] = useState<string | null>(null)

  const [erro, setErro] = useState<{ titulo: string; mensagem: string } | null>(null)
  const [semSaldo, setSemSaldo] = useState(false)
  const [criticos, setCriticos] = useState<AlertaEstoque[]>([])
  const topo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    servicesGetAnalisesEstoque().then((resposta) => {
      if (!("isError" in resposta)) setHistorico(resposta)
      setCarregandoHistorico(false)
    })
  }, [])

  // Mensagens de progresso enquanto o servidor trabalha (a requisição é única)
  useEffect(() => {
    if (!analisando) return
    setEtapa(0)
    const tempos = [2500, 5000, 8000, 30000]
    const timers = tempos.map((ms, i) => setTimeout(() => setEtapa(i + 1), ms))
    return () => timers.forEach(clearTimeout)
  }, [analisando])

  function rolarParaTopo() {
    topo.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function escolherArquivo(novo: File) {
    const nome = novo.name.toLowerCase()
    if (!EXTENSOES.some((ext) => nome.endsWith(ext))) {
      setErro({ titulo: "Formato não aceito", mensagem: "Envie a planilha em .xlsx (Excel) ou .csv. Se estiver em .xls, salve como .xlsx antes de enviar." })
      return
    }
    if (novo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      setErro({ titulo: "Arquivo muito grande", mensagem: `O limite é ${TAMANHO_MAXIMO_MB} MB. Envie um período menor (por exemplo, 6 meses).` })
      return
    }
    if (novo.size === 0) {
      setErro({ titulo: "Arquivo vazio", mensagem: "O arquivo selecionado não tem conteúdo." })
      return
    }
    setArquivo(novo)
  }

  async function confirmarAnalise() {
    if (!arquivo) return
    const enviado = arquivo
    setArquivo(null)
    setAnalisando(true)
    const resposta = await servicesAnalisarEstoque(enviado, horizonte)
    setAnalisando(false)

    if ("isError" in resposta) {
      if (resposta.status === 402) setSemSaldo(true)
      else setErro({ titulo: "Não foi possível analisar a planilha", mensagem: resposta.message })
      return
    }

    setAnalise(resposta)
    setConfigurando(false)
    setHistorico((h) => [resposta, ...h.filter((a) => a.id !== resposta.id)])
    // A mesma planilha substitui a análise antiga no servidor: recarrega a lista
    servicesGetAnalisesEstoque().then((lista) => {
      if (!("isError" in lista)) setHistorico(lista)
    })
    setCriticos(resposta.alertas.filter((a) => a.nivel === "critico"))
    rolarParaTopo()
    if (resposta.creditos_cobrados > 0) {
      servicesGetCreditosSaldo().then((res) => {
        if (!("isError" in res)) notificarCreditosAtualizados(res.saldo)
      })
    }
  }

  async function abrir(id: number) {
    if (analise?.id === id) {
      setConfigurando(false)
      return rolarParaTopo()
    }
    setAbrindo(id)
    const resposta = await servicesGetAnaliseEstoque(id)
    setAbrindo(null)
    if ("isError" in resposta) {
      setErro({ titulo: "Não foi possível abrir a análise", mensagem: resposta.message })
      return
    }
    setAnalise(resposta)
    setConfigurando(false)
    rolarParaTopo()
  }

  async function confirmarExclusao() {
    if (!excluir) return
    setExcluindo(true)
    const resposta = await servicesDeleteAnaliseEstoque(excluir.id)
    setExcluindo(false)
    if ("isError" in resposta) {
      setErro({ titulo: "Não foi possível excluir", mensagem: resposta.message })
    } else {
      setHistorico((h) => h.filter((a) => a.id !== excluir.id))
      if (analise?.id === excluir.id) setAnalise(null)
    }
    setExcluir(null)
  }

  async function baixar(caminho: string, nome: string) {
    setBaixando(caminho)
    const falha = await servicesBaixarArquivoEstoque(caminho, nome)
    setBaixando(null)
    if (falha) setErro({ titulo: "Não foi possível baixar o arquivo", mensagem: falha })
  }

  const rotuloHorizonte = HORIZONTES.find((h) => h.dias === horizonte)?.rotulo ?? `${horizonte} dias`

  return (
    <div ref={topo} className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start scroll-mt-24">
      <div className="min-w-0">
        {analise && configurando ? (
          <ConfigurarAnuncios
            key={analise.id}
            analise={analise}
            onVoltar={() => { setConfigurando(false); rolarParaTopo() }}
            onPublicado={setAnalise}
          />
        ) : analise ? (
          <ResultadoAnalise
            analise={analise}
            baixandoRelatorio={baixando === `analises/${analise.id}/relatorio/`}
            onBaixarRelatorio={() => baixar(`analises/${analise.id}/relatorio/`, `analise_estoque_${analise.id}.xlsx`)}
            onNovaAnalise={() => { setAnalise(null); rolarParaTopo() }}
            onConfigurar={() => { setConfigurando(true); rolarParaTopo() }}
          />
        ) : (
          <EnvioPlanilha
            horizonte={horizonte}
            onHorizonte={setHorizonte}
            analisando={analisando}
            etapa={etapa}
            custo={custo}
            custoAnuncio={custoAnuncio}
            onArquivo={escolherArquivo}
            onBaixar={baixar}
            baixando={baixando}
          />
        )}
      </div>

      <aside className="2xl:sticky 2xl:top-24">
        <HistoricoAnalises
          analises={historico}
          carregando={carregandoHistorico}
          selecionada={analise?.id ?? null}
          abrindo={abrindo}
          onAbrir={abrir}
          onExcluir={setExcluir}
        />
      </aside>

      {/* Confirmação do envio (mostra o custo, como as outras funções pagas) */}
      <ConfirmarDialog
        open={arquivo !== null}
        onOpenChange={(open) => { if (!open) setArquivo(null) }}
        titulo="Analisar estoque com IA?"
        mensagem="A IA analisa as movimentações e sugere o que anunciar. Os créditos só são cobrados se a IA responder."
        confirmar={`Analisar (${custo})`}
        onConfirmar={confirmarAnalise}
      >
        {arquivo && (
          <Resumo itens={[
            ["Arquivo", arquivo.name],
            ["Tamanho", fmtTamanho(arquivo.size)],
            ["Horizonte", rotuloHorizonte],
            ["Custo da análise", custo],
          ]} />
        )}
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
          <p>
            Os {custo} são só da análise. Cada anúncio que você publicar depois, a partir das sugestões, usa mais{" "}
            <span className="font-semibold">{custoAnuncio}</span>, cobrados apenas na publicação. Você escolhe quais publicar
            e pode voltar a esta análise depois para publicar os demais.
          </p>
        </div>
      </ConfirmarDialog>

      {/* Alertas críticos logo após a análise */}
      <ModalPadrao
        open={criticos.length > 0}
        onOpenChange={(open) => { if (!open) setCriticos([]) }}
        titulo={
          <span className="flex items-center gap-2">
            <AlertOctagon size={20} className="text-red-600" aria-hidden="true" /> Atenção antes de anunciar
          </span>
        }
        descricao="A análise foi salva, mas encontrou pontos que pedem cuidado:"
        acoes={<button type="button" onClick={() => setCriticos([])} className={BOTAO.primario}>Ver análise</button>}
      >
        <ul className="space-y-3">
          {criticos.map((a) => (
            <li key={a.titulo} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-800">{a.titulo}</p>
              <p className="text-sm text-red-700 mt-0.5">{a.mensagem}</p>
            </li>
          ))}
        </ul>
      </ModalPadrao>

      <AvisoDialog open={erro !== null} onClose={() => setErro(null)} titulo={erro?.titulo ?? ""} mensagem={erro?.mensagem ?? ""} />

      <ModalPadrao
        open={semSaldo}
        onOpenChange={setSemSaldo}
        titulo="Saldo insuficiente"
        descricao={`Você não tem créditos suficientes para analisar o estoque com IA (${custo}). Compre um pacote na Central de Créditos para continuar.`}
        acoes={
          <>
            <button type="button" onClick={() => setSemSaldo(false)} className={BOTAO.secundario}>Agora não</button>
            <button type="button" onClick={() => router.push("/creditos")} className={BOTAO.primario}>Ver pacotes de créditos</button>
          </>
        }
      />

      <ConfirmarDialog
        open={excluir !== null}
        onOpenChange={(open) => { if (!open) setExcluir(null) }}
        titulo="Excluir análise?"
        mensagem={excluir ? `A análise de ${fmtDataHora(excluir.criado_em)} (${excluir.nome_arquivo}) será removida do histórico. Esta ação não pode ser desfeita.` : ""}
        confirmar="Excluir"
        variante="perigo"
        carregando={excluindo}
        onConfirmar={confirmarExclusao}
      />
    </div>
  )
}
