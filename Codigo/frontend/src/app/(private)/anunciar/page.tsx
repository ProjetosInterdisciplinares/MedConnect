"use client"

import React, { useEffect, useState } from "react"
import { hojeISO } from "@/lib/format/hoje"
import { useRouter, useSearchParams } from "next/navigation"
import { ModalPadrao, AvisoDialog, Resumo, BOTAO } from "@/components/ui/modal-padrao"
import { Megaphone, Package, Hash, DollarSign, FileText, Sparkles, CheckCircle, Calendar, Layers, FileSpreadsheet, Coins, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import servicesGetMatMed from "@/server/(GET)-mat-med"
import servicesGetMeusAnuncios from "@/server/(GET)-meus-anuncios"
import servicesCreateAnuncio from "@/server/(POST)-anuncio"
import servicesGerarAnuncio from "@/server/(POST)-gerar-anuncio"
import servicesGetCreditosSaldo from "@/server/(GET)-creditos-saldo"
import { notificarCreditosAtualizados } from "@/lib/creditos"
import { rotuloCreditos, useCustosCreditos } from "@/hooks/useCustosCreditos"
import UploadImagem from "@/components/ui/upload-imagem"
import { otimizarImagem } from "@/lib/imagem"
import { Anuncio, CreateAnuncioForm, MatMed } from "@/types"
import SecaoTabs from "@/components/layout/SecaoTabs"


import InputField from "@/components/cadastro/InputField"
import { AuthManager } from "@/lib/AuthManager"

/** Campos reaproveitados do último anúncio do mesmo insumo (lote, datas e quantidade são sempre do novo lote). */
type Reaproveitado = { val_base: string; ds_obs: string; imagem_anuncio: string; data: string }

function formatarData(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR")
}

export default function AnunciarPage() {
  const custos = useCustosCreditos()
  const custoPublicacao = rotuloCreditos(custos.publicacao)
  const custoIA = rotuloCreditos(custos.ia)
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const matParam = Number(searchParams.get("mat")) || 0

  // Endereço antigo do cadastro em massa (agora em Anúncios → Cadastro em massa)
  useEffect(() => {
    if (tabParam === "cadastro_massa") router.replace("/anunciar-em-massa")
  }, [tabParam, router])

  const [materiais, setMateriais] = useState<MatMed[]>([])
  const [meusAnuncios, setMeusAnuncios] = useState<Anuncio[]>([])
  const [reaproveitado, setReaproveitado] = useState<Reaproveitado | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const [anuncioForm, setAnuncioForm] = useState<CreateAnuncioForm>({
    cd_mat: 0,
    ds_lote: "",
    dt_fabricacao: "",
    dt_validade: "",
    qtd_mat: 0,
    val_base: "",
    ds_obs: "",
    cd_pessoa_anunciante: 0,
    imagem_anuncio: "",
    val_minimo: "",
    ie_aceita_parcial: true,
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [isConfirmPublishOpen, setIsConfirmPublishOpen] = useState(false)
  const [isConfirmAIOpen, setIsConfirmAIOpen] = useState(false)
  const [isInsufficientCreditsOpen, setIsInsufficientCreditsOpen] = useState(false)
  const [missingCreditsFeature, setMissingCreditsFeature] = useState("")
  const [lastSaved, setLastSaved] = useState<CreateAnuncioForm | null>(null)

  // Modal genérico para alertas de erro
  const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "", message: "" })

  function showError(title: string, message: string) {
    setErrorModal({ open: true, title, message })
  }


  useEffect(() => {
    const userId = AuthManager.getInstance().getUserId() || 0
    setAnuncioForm((prev) => ({ ...prev, cd_pessoa_anunciante: userId }))

    async function fetchData() {
      const [responseMateriais, responseAnuncios] = await Promise.all([servicesGetMatMed(), servicesGetMeusAnuncios()])
      if (responseMateriais && !("isError" in responseMateriais)) {
        setMateriais(responseMateriais)
      }
      if (responseAnuncios && !("isError" in responseAnuncios)) {
        const lista = Array.isArray(responseAnuncios) ? responseAnuncios : ((responseAnuncios as { data?: Anuncio[] }).data ?? [])
        setMeusAnuncios(lista)
      }
    }

    fetchData()
  }, [])

  function handleMatChange(value: string | null) {
    const cdMat = value ? Number(value) : 0
    // Último anúncio deste insumo publicado pela instituição
    const anterior = cdMat
      ? meusAnuncios
          .filter((a) => Number(a.cd_mat) === cdMat)
          .sort((a, b) => (b.data_anuncio || "").localeCompare(a.data_anuncio || "") || b.nr_anuncio - a.nr_anuncio)[0]
      : undefined
    const novo: Reaproveitado | null = anterior
      ? {
          val_base: anterior.val_base ? String(anterior.val_base).replace(".", ",") : "",
          ds_obs: anterior.ds_obs || "",
          imagem_anuncio: anterior.imagem_anuncio || "",
          data: anterior.data_anuncio,
        }
      : null

    setAnuncioForm((prev) => {
      // Só troca campos vazios ou que ainda guardam o que foi reaproveitado antes
      const livre = (campo: "val_base" | "ds_obs" | "imagem_anuncio") => !prev[campo] || prev[campo] === reaproveitado?.[campo]
      return {
        ...prev,
        cd_mat: cdMat,
        val_base: livre("val_base") ? (novo?.val_base ?? "") : prev.val_base,
        ds_obs: livre("ds_obs") ? (novo?.ds_obs ?? "") : prev.ds_obs,
        imagem_anuncio: livre("imagem_anuncio") ? (novo?.imagem_anuncio ?? "") : prev.imagem_anuncio,
      }
    })
    setReaproveitado(novo)
  }

  function limparReaproveitado() {
    setAnuncioForm((prev) => ({ ...prev, val_base: "", ds_obs: "", imagem_anuncio: "" }))
    setReaproveitado(null)
  }

  // Insumo recém-cadastrado chega selecionado (?mat=ID)
  useEffect(() => {
    if (!matParam || anuncioForm.cd_mat || materiais.length === 0) return
    if (materiais.some((m) => Number(m.cd_mat) === matParam)) handleMatChange(String(matParam))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matParam, materiais, meusAnuncios])

  const matSelecionado = materiais.find((m) => Number(m.cd_mat) === Number(anuncioForm.cd_mat))

  async function handleConfirmAI() {
    setIsConfirmAIOpen(false)
    setIsGenerating(true)
    try {
      const response = await (servicesGerarAnuncio as any)({
        cd_mat: anuncioForm.cd_mat,
        ds_lote: anuncioForm.ds_lote,
        dt_validade: anuncioForm.dt_validade,
        cd_pessoa_anunciante: anuncioForm.cd_pessoa_anunciante,
        qtd_mat: anuncioForm.qtd_mat,
      })

      if (response && "isError" in response) {
        if (response.status === 402) {
          setMissingCreditsFeature(`gerar a descrição com IA (${custoIA})`)
          setIsInsufficientCreditsOpen(true)
          return
        }
        throw new Error(response.message || "Erro interno ao processar a descrição.")
      }

      if (response.texto_sugerido) {
        setAnuncioForm((prev) => ({ ...prev, ds_obs: response.texto_sugerido }))

        servicesGetCreditosSaldo().then(res => {
          if (!("isError" in res)) notificarCreditosAtualizados(res.saldo)
        })
      }
    } catch (error: any) {
      console.error("Erro na geração por IA:", error)
      showError("Erro na Geração", error.message || "Não foi possível gerar a descrição automática no momento.")
    } finally {
      setIsGenerating(false)
    }
  }

  function handleImageUpload(file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      showError("Formato não aceito", "Envie uma imagem PNG, JPG ou WEBP.")
      return
    }

    // Fotos grandes (ex.: de celular) são aceitas: a imagem é reduzida sem cortar
    if (file.size > 20 * 1024 * 1024) {
      showError("Imagem muito grande", "Envie uma imagem de até 20 MB.")
      return
    }

    otimizarImagem(file)
      .then((imagem) => setAnuncioForm((prev) => ({ ...prev, imagem_anuncio: imagem })))
      .catch(() => showError("Erro de leitura", "Não foi possível ler o arquivo de imagem."))
  }


  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors: Record<string, string> = {}
    if (!anuncioForm.cd_mat) errors.cd_mat = "Selecione um insumo."
    if (!anuncioForm.ds_lote) errors.ds_lote = "Lote é obrigatório."
    if (!anuncioForm.dt_fabricacao) errors.dt_fabricacao = "Data de fabricação é obrigatória."
    if (!anuncioForm.dt_validade) errors.dt_validade = "Data de validade é obrigatória."
    else if (anuncioForm.dt_validade < hojeISO()) errors.dt_validade = "Produto vencido: a validade não pode ser anterior a hoje."
    else if (anuncioForm.dt_fabricacao && anuncioForm.dt_validade < anuncioForm.dt_fabricacao)
      errors.dt_validade = "A validade não pode ser anterior à data de fabricação."
    if (!anuncioForm.qtd_mat || anuncioForm.qtd_mat <= 0) errors.qtd_mat = "Quantidade inválida."
    if (!anuncioForm.val_base) errors.val_base = "Valor é obrigatório."
    const valorBase = Number(anuncioForm.val_base.replace(",", "."))
    const valorMinimo = Number((anuncioForm.val_minimo || "").replace(",", "."))
    if (anuncioForm.val_minimo) {
      if (!(valorMinimo > 0)) errors.val_minimo = "Informe um valor mínimo maior que zero."
      else if (valorBase > 0 && valorMinimo > valorBase) errors.val_minimo = "O valor mínimo não pode ser maior que o valor base."
    }
    if (!anuncioForm.ds_obs) errors.ds_obs = "Descrição é obrigatória."

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    const valorTratadoString = anuncioForm.val_base.replace(",", ".").trim()

    const dataToSend: CreateAnuncioForm = {
      cd_mat: anuncioForm.cd_mat,
      ds_lote: anuncioForm.ds_lote || null,
      dt_fabricacao: anuncioForm.dt_fabricacao || null,
      dt_validade: anuncioForm.dt_validade || null,
      qtd_mat: anuncioForm.qtd_mat,
      val_base: valorTratadoString || "0.00",
      ds_obs: anuncioForm.ds_obs,
      imagem_anuncio: anuncioForm.imagem_anuncio || undefined,
      cd_pessoa_anunciante: anuncioForm.cd_pessoa_anunciante,
      val_minimo: anuncioForm.val_minimo ? anuncioForm.val_minimo.replace(",", ".").trim() : null,
      ie_aceita_parcial: anuncioForm.ie_aceita_parcial ?? true,
    }

    setLastSaved(dataToSend)
    setIsConfirmPublishOpen(true)
  }

  async function handleConfirmPublish() {
    if (!lastSaved) return
    setIsConfirmPublishOpen(false)

    const response = await (servicesCreateAnuncio as any)(lastSaved)

    if (response && "isError" in response) {
      console.error("Erro ao criar anúncio:", response.message)
      if (response.status === 402) {
        setMissingCreditsFeature(`publicar o anúncio (${custoPublicacao})`)
        setIsInsufficientCreditsOpen(true)
      } else {
        setFieldErrors({ global: response.message || "Falha ao publicar o anúncio. Tente novamente." })
      }
      return
    }

    setIsSuccessOpen(true)

    // Atualiza o saldo global, pois a publicação consumiu créditos
    servicesGetCreditosSaldo().then(res => {
      if (!("isError" in res)) notificarCreditosAtualizados(res.saldo)
    })
  }

  function resetForm() {
    setAnuncioForm({
      cd_mat: 0,
      ds_lote: "",
      dt_fabricacao: "",
      dt_validade: "",
      qtd_mat: 0,
      val_base: "",
      ds_obs: "",
      cd_pessoa_anunciante: AuthManager.getInstance().getUserId() || 0,
      imagem_anuncio: "",
      val_minimo: "",
      ie_aceita_parcial: true,
    })
    setLastSaved(null)
    setReaproveitado(null)
  }

  function handleCloseSuccess() {
    setIsSuccessOpen(false)
    resetForm()
  }

  return (
    <div className="relative w-full antialiased">

      <div className="w-full relative z-10">
        <SecaoTabs secao="anuncios" />

        {/* Header da Página */}
        <div className="mb-6">
          <h1 className="sr-only">Publicar novo anúncio</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Escolha um insumo cadastrado e informe os dados do lote para publicá-lo no catálogo.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* Área de Conteúdo principal */}
          <main className="flex-1 min-w-0 w-full">
            {(
              <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">

                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-800">Formulário de Publicação</h2>
                  <p className="text-sm text-slate-500 mt-1">Preencha os detalhes do produto que deseja vender.</p>
                </div>

                {fieldErrors.global && (
                  <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {fieldErrors.global}
                  </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>

                  {/* BLOCO 1: SELEÇÃO DE INSUMO E LOTE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">Insumo <span className="text-red-500 text-xs mt-0.5">*</span></label>
                      <Select
                        value={anuncioForm.cd_mat ? String(anuncioForm.cd_mat) : ""}
                        onValueChange={(val) => {
                          setFieldErrors(prev => ({ ...prev, cd_mat: "" }))
                          handleMatChange(val)
                        }}
                        disabled={materiais.length === 0}
                        required
                      >
                        <SelectTrigger className={`w-full bg-slate-50 border rounded-xl text-sm h-[42px] ${fieldErrors.cd_mat ? "border-red-300 focus:ring-2 focus:ring-red-400" : "border-slate-200 focus:ring-blue-900/20 focus:border-blue-900"
                          }`}>
                          <div className="flex items-center gap-2 min-w-0 text-slate-900 truncate">
                            <Package size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                            <SelectValue placeholder="Selecione o insumo cadastrado">
                              {anuncioForm.cd_mat
                                ? (() => {
                                  const mat = materiais.find(m => String(m.cd_mat) === String(anuncioForm.cd_mat));
                                  return mat ? `${mat.ds_mat || mat.cd_tuss} ${mat.unidade_med ? `(${mat.unidade_med})` : ""}` : undefined;
                                })()
                                : undefined}
                            </SelectValue>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Insumos Disponíveis</SelectLabel>
                            {materiais.map((mat) => (
                              <SelectItem key={mat.cd_mat} value={String(mat.cd_mat)}>
                                {mat.ds_mat || mat.cd_tuss} {mat.unidade_med ? `(${mat.unidade_med})` : ""}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {fieldErrors.cd_mat && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <CheckCircle className="w-3 h-3 shrink-0 hidden" />
                          {fieldErrors.cd_mat}
                        </p>
                      )}
                      {materiais.length === 0 && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Nenhum insumo cadastrado. <a href="/cadastrar" className="font-semibold text-blue-700 hover:underline">Cadastre o primeiro insumo</a>
                        </p>
                      )}

                      {matSelecionado && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50">
                          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 px-4 py-3 text-sm">
                            {[
                              ["Categoria", matSelecionado.ds_tipo],
                              ["Marca", matSelecionado.ds_marca],
                              ["Unidade", matSelecionado.unidade_med],
                              ["TUSS", matSelecionado.cd_tuss],
                            ].map(([rotulo, valor]) => (
                              <div key={rotulo} className="min-w-0">
                                <dt className="text-xs text-slate-500">{rotulo}</dt>
                                <dd className="mt-0.5 font-medium text-slate-900 truncate tabular-nums">{valor || "Não informado"}</dd>
                              </div>
                            ))}
                          </dl>
                          {reaproveitado && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-200 text-xs text-slate-600">
                              <p>
                                Valor, observações e foto vieram do seu último anúncio deste insumo{formatarData(reaproveitado.data) ? ` (${formatarData(reaproveitado.data)})` : ""}. Informe os dados do novo lote.
                              </p>
                              <button type="button" onClick={limparReaproveitado} className="shrink-0 self-start sm:self-auto font-semibold text-slate-700 hover:text-blue-700">
                                Limpar
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField
                      label="Lote"
                      icon={Layers}
                      type="text"
                      required
                      placeholder="Ex: L123456"
                      value={anuncioForm.ds_lote || ""}
                      error={fieldErrors.ds_lote}
                      onChange={(e) => {
                        setFieldErrors((prev) => ({ ...prev, ds_lote: "" }))
                        setAnuncioForm((prev) => ({ ...prev, ds_lote: e.target.value }))
                      }}
                    />

                    <InputField
                      label="Data de Fabricação"
                      icon={Calendar}
                      type="date"
                      required
                      value={anuncioForm.dt_fabricacao || ""}
                      error={fieldErrors.dt_fabricacao}
                      onChange={(e) => {
                        setFieldErrors((prev) => ({ ...prev, dt_fabricacao: "" }))
                        setAnuncioForm((prev) => ({ ...prev, dt_fabricacao: e.target.value }))
                      }}
                    />

                    <InputField
                      label="Data de Validade"
                      icon={Calendar}
                      type="date"
                      required
                      min={hojeISO()}
                      value={anuncioForm.dt_validade || ""}
                      error={fieldErrors.dt_validade}
                      onChange={(e) => {
                        const valor = e.target.value
                        setFieldErrors((prev) => ({
                          ...prev,
                          dt_validade: valor && valor < hojeISO() ? "Produto vencido: a validade não pode ser anterior a hoje." : "",
                        }))
                        setAnuncioForm((prev) => ({ ...prev, dt_validade: valor }))
                      }}
                    />
                  </div>

                  {/* BLOCO 2: VALORES E QUANTIDADES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label="Quantidade Disponível"
                      icon={Hash}
                      type="number"
                      required
                      min="1"
                      placeholder="Ex: 500"
                      value={anuncioForm.qtd_mat || ""}
                      error={fieldErrors.qtd_mat}
                      onChange={(e) => {
                        setFieldErrors((prev) => ({ ...prev, qtd_mat: "" }))
                        setAnuncioForm((prev) => ({ ...prev, qtd_mat: Number(e.target.value) }))
                      }}
                    />

                    <InputField
                      label="Valor Base (R$)"
                      icon={DollarSign}
                      type="text"
                      required
                      placeholder="Ex: 15,90"
                      value={anuncioForm.val_base}
                      error={fieldErrors.val_base}
                      onChange={(e) => {
                        setFieldErrors((prev) => ({ ...prev, val_base: "" }))
                        setAnuncioForm((prev) => ({ ...prev, val_base: e.target.value }))
                      }}
                    />
                  </div>

                  {/* BLOCO 2.1: CONDIÇÕES DE VENDA */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                      <InputField
                        label="Valor mínimo aceito (R$)"
                        icon={DollarSign}
                        type="text"
                        placeholder="Ex: 1200,00"
                        value={anuncioForm.val_minimo || ""}
                        error={fieldErrors.val_minimo}
                        onChange={(e) => {
                          setFieldErrors((prev) => ({ ...prev, val_minimo: "" }))
                          setAnuncioForm((prev) => ({ ...prev, val_minimo: e.target.value }))
                        }}
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Opcional. Menor valor que você aceita pelo lote inteiro. Propostas abaixo dele são recusadas automaticamente, e só você vê esse valor.
                      </p>
                    </div>

                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer md:mt-6">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-blue-700 cursor-pointer"
                        checked={anuncioForm.ie_aceita_parcial ?? true}
                        onChange={(e) => setAnuncioForm((prev) => ({ ...prev, ie_aceita_parcial: e.target.checked }))}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-700">Aceito compra parcial</span>
                        <span className="block text-xs text-slate-500">
                          Se desmarcado, o comprador só pode propor ou comprar o lote inteiro.
                        </span>
                      </span>
                    </label>
                  </div>

                  {/* BLOCO 3: OBSERVAÇÕES COM BOTÃO DE IA EMBUTIDO */}
                  <div className="w-full">
                    <InputField
                      label="Descrição"
                      icon={FileText}
                      type="textarea"
                      required
                      placeholder="Ex: Caixas levemente amassadas, mas produto intacto..."
                      value={anuncioForm.ds_obs}
                      error={fieldErrors.ds_obs}
                      onChange={(e) => {
                        setFieldErrors((prev) => ({ ...prev, ds_obs: "" }))
                        setAnuncioForm((prev) => ({ ...prev, ds_obs: e.target.value }))
                      }}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => {
                            if (!anuncioForm.cd_mat || !anuncioForm.qtd_mat) {
                              showError("Faltam informações", "Selecione o insumo e informe a quantidade antes de gerar a descrição com IA.")
                              return
                            }
                            setIsConfirmAIOpen(true)
                          }}
                          disabled={isGenerating}
                          className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-60 cursor-pointer"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-slate-500" />
                              Gerando…
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} className="text-blue-700" aria-hidden="true" />
                              <span className="sm:hidden">Gerar com IA</span>
                              <span className="hidden sm:inline">Gerar descrição com IA</span>
                              <span className="ml-1 pl-2 border-l border-slate-200 font-normal text-slate-500">{custoIA}</span>
                            </>
                          )}
                        </button>
                      }
                    />
                  </div>

                  {/* BLOCO 4: IMAGEM DO ANÚNCIO */}
                  <UploadImagem
                    imagem={anuncioForm.imagem_anuncio || ""}
                    onArquivo={handleImageUpload}
                    onRemover={() => setAnuncioForm(prev => ({ ...prev, imagem_anuncio: "" }))}
                    tamanhoMaximoMB={20}
                  />

                  <div className="mt-2 pt-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                    <p className="flex items-center gap-1.5 text-sm text-slate-500 sm:mr-auto">
                      <Coins size={15} className="text-slate-400" aria-hidden="true" />
                      A publicação usa <span className="font-semibold text-slate-700">{custoPublicacao}</span> do seu saldo.
                    </p>
                    <button
                      type="submit"
                      className="h-11 px-6 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                      Publicar anúncio
                    </button>
                  </div>
                </form>
              </div>
            )}
          </main>
        </div>

        <ModalPadrao
          open={isSuccessOpen}
          onOpenChange={(open) => { if (!open) handleCloseSuccess() }}
          titulo="Anúncio publicado"
          descricao="O insumo já está visível no catálogo para as outras instituições."
          acoes={
            <>
              <button type="button" onClick={handleCloseSuccess} className={BOTAO.secundario}>Publicar outro</button>
              <button type="button" onClick={() => router.push("/meus-anuncios")} className={BOTAO.primario}>Ver meus anúncios</button>
            </>
          }
        >
          {lastSaved && (
            <Resumo itens={[
              ["Insumo", materiais.find(m => String(m.cd_mat) === String(lastSaved.cd_mat))?.ds_mat || "Insumo"],
              ["Quantidade", lastSaved.qtd_mat],
              ["Valor do lote", `R$ ${lastSaved.val_base}`],
              ["Valor mínimo", lastSaved.val_minimo ? `R$ ${lastSaved.val_minimo}` : "Não definido"],
              ["Compra parcial", lastSaved.ie_aceita_parcial === false ? "Não aceita" : "Aceita"],
              ...(lastSaved.ds_lote ? [["Lote", lastSaved.ds_lote] as [string, string]] : []),
            ]} />
          )}
        </ModalPadrao>

        {/* MODAL DE CONFIRMAÇÃO IA */}
        <Dialog open={isConfirmAIOpen} onOpenChange={setIsConfirmAIOpen}>
          <DialogContent showCloseButton={false} className="sm:max-w-md p-6 gap-0 bg-white">
            <DialogTitle className="text-lg font-semibold text-slate-900">Gerar descrição com IA?</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-600 leading-relaxed">
              A IA sugere um texto a partir do insumo e da quantidade informados. Revise antes de publicar.
            </DialogDescription>
            <dl className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm">
              <dt className="text-slate-500">Custo</dt>
              <dd className="font-semibold text-slate-900 tabular-nums">{custoIA}</dd>
            </dl>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmAIOpen(false)}
                className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAI}
                className="h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white transition-colors"
              >
                Gerar descrição
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AVISO / ERRO */}
        <AvisoDialog
          open={errorModal.open}
          onClose={() => setErrorModal(prev => ({ ...prev, open: false }))}
          titulo={errorModal.title}
          mensagem={errorModal.message}
        />

        {/* MODAL DE CONFIRMAÇÃO DE PUBLICAÇÃO */}
        <Dialog open={isConfirmPublishOpen} onOpenChange={setIsConfirmPublishOpen}>
          <DialogContent showCloseButton={false} className="sm:max-w-md p-6 gap-0 bg-white">
            <DialogTitle className="text-lg font-semibold text-slate-900">Publicar anúncio?</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-600">
              Revise os dados. Após a publicação, o anúncio fica visível no catálogo.
            </DialogDescription>
            {lastSaved && (
              <dl className="mt-5 rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
                {[
                  ["Insumo", materiais.find(m => String(m.cd_mat) === String(lastSaved.cd_mat))?.ds_mat || "Insumo"],
                  ["Quantidade", `${lastSaved.qtd_mat} unid.`],
                  ["Valor base", `R$ ${lastSaved.val_base}`],
                  ["Custo", custoPublicacao],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo} className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-slate-500">{rotulo}</dt>
                    <dd className="font-medium text-slate-900 text-right tabular-nums">{valor}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmPublishOpen(false)}
                className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                className="h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white transition-colors"
              >
                Publicar ({custoPublicacao})
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL SEM CRÉDITOS */}
        <Dialog open={isInsufficientCreditsOpen} onOpenChange={setIsInsufficientCreditsOpen}>
          <DialogContent showCloseButton={false} className="sm:max-w-md p-6 gap-0 bg-white">
            <DialogTitle className="text-lg font-semibold text-slate-900">Saldo insuficiente</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-slate-600 leading-relaxed">
              Você não tem créditos suficientes para {missingCreditsFeature}. Compre um pacote na Central de Créditos para continuar.
            </DialogDescription>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsInsufficientCreditsOpen(false)}
                className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={() => router.push("/creditos")}
                className="h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white transition-colors"
              >
                Ver pacotes de créditos
              </button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}