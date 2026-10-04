"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Megaphone, Package, Hash, DollarSign, FileText, Sparkles, CheckCircle, ImagePlus, X, Crop, ZoomIn, Calendar, Layers, FileSpreadsheet, Coins } from "lucide-react"
import Cropper, { Area } from "react-easy-crop"
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
import servicesCreateAnuncio from "@/server/(POST)-anuncio"
import servicesGerarAnuncio from "@/server/(POST)-gerar-anuncio"
import servicesGetCreditosSaldo from "@/server/(GET)-creditos-saldo"
import { notificarCreditosAtualizados } from "@/lib/creditos"
import { CreateAnuncioForm, MatMed } from "@/types"
import AnimatedBackground from "@/components/ui/animated-background"
import CadastroMassa from "@/components/anunciar/cadastro-massa"

import InputField from "@/components/cadastro/InputField"
import { AuthManager } from "@/lib/AuthManager"

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (error) => reject(error)
    img.src = imageSrc
  })
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return canvas.toDataURL("image/jpeg", 0.9)
}

export default function AnunciarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab") as "publicar" | "cadastro_massa" | null

  const [activeTab, setActiveTab] = useState<"publicar" | "cadastro_massa">(tabParam || "publicar")

  useEffect(() => {
    if (tabParam && ["publicar", "cadastro_massa"].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const [materiais, setMateriais] = useState<MatMed[]>([])
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

  // Estados do Cropper
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string>("")
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  useEffect(() => {
    const userId = AuthManager.getInstance().getUserId() || 0
    setAnuncioForm((prev) => ({ ...prev, cd_pessoa_anunciante: userId }))

    async function fetchData() {
      const responseMateriais = await servicesGetMatMed()
      if (responseMateriais && !("isError" in responseMateriais)) {
        setMateriais(responseMateriais)
      }
    }

    fetchData()
  }, [])

  function handleMatChange(value: string | null) {
    if (!value) {
      setAnuncioForm((prev) => ({ ...prev, cd_mat: 0 }))
      return
    }
    const cdMat = Number(value)
    setAnuncioForm((prev) => ({ ...prev, cd_mat: cdMat }))
  }

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
          setMissingCreditsFeature("gerar a descrição com IA (1 crédito)")
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

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5242880) {
      showError("Imagem muito grande", "A imagem selecionada é muito grande. O limite máximo é de 5MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64String = event.target?.result as string
      setImageToCrop(base64String)
      setCropModalOpen(true)
    }
    reader.onerror = () => {
      showError("Erro de Leitura", "Não foi possível ler o arquivo de imagem.")
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveCrop() {
    if (imageToCrop && croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels)
        setAnuncioForm((prev) => ({ ...prev, imagem_anuncio: croppedImage }))
        setCropModalOpen(false)
        setImageToCrop("")
      } catch (e) {
        console.error(e)
        showError("Erro ao Cortar", "Não foi possível cortar e processar a imagem.")
      }
    }
  }


  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors: Record<string, string> = {}
    if (!anuncioForm.cd_mat) errors.cd_mat = "Selecione um insumo."
    if (!anuncioForm.ds_lote) errors.ds_lote = "Lote é obrigatório."
    if (!anuncioForm.dt_fabricacao) errors.dt_fabricacao = "Data de fabricação é obrigatória."
    if (!anuncioForm.dt_validade) errors.dt_validade = "Data de validade é obrigatória."
    if (!anuncioForm.qtd_mat || anuncioForm.qtd_mat <= 0) errors.qtd_mat = "Quantidade inválida."
    if (!anuncioForm.val_base) errors.val_base = "Valor é obrigatório."
    if (!anuncioForm.ds_obs) errors.ds_obs = "Observações são obrigatórias."

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
        setMissingCreditsFeature("publicar o anúncio (5 créditos)")
        setIsInsufficientCreditsOpen(true)
      } else {
        setFieldErrors({ global: response.message || "Falha ao publicar o anúncio. Tente novamente." })
      }
      return
    }

    setIsSuccessOpen(true)
    
    // Atualiza o saldo global pois consumimos 5 créditos
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
    })
    setLastSaved(null)
  }

  function handleCloseSuccess() {
    setIsSuccessOpen(false)
    resetForm()
  }

  return (
    <div className="relative min-h-screen w-full antialiased bg-slate-50/50 selection:bg-blue-900/20">
      <AnimatedBackground />
      <div className="max-w-7xl mx-auto py-8 px-4 relative z-10">

        {/* Header da Página */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
              <Megaphone size={20} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              Anunciar
            </h1>
          </div>
          <p className="text-slate-500 text-sm md:text-base font-medium max-w-2xl">
            Selecione um de seus materiais cadastrados para anunciar no marketplace ou baixe o template para fazer publicações em massa.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            <nav className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("publicar")}
                className={`relative w-full text-left flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 group ${activeTab === "publicar" ? "bg-white shadow-sm ring-1 ring-slate-200/50" : "hover:bg-white/50"
                  }`}
              >
                {activeTab === "publicar" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-900 rounded-r-full" />}
                <div className={`shrink-0 rounded-xl p-2 transition-colors ${activeTab === "publicar" ? "bg-blue-50 text-blue-900" : "bg-slate-100 text-slate-500 group-hover:text-blue-900 group-hover:bg-blue-50/50"
                  }`}>
                  <Megaphone size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-sm">Publicar Anúncio</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">Criar nova oferta de venda</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("cadastro_massa")}
                className={`relative w-full text-left flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 group ${activeTab === "cadastro_massa" ? "bg-white shadow-sm ring-1 ring-slate-200/50" : "hover:bg-white/50"
                  }`}
              >
                {activeTab === "cadastro_massa" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-900 rounded-r-full" />}
                <div className={`shrink-0 rounded-xl p-2 transition-colors ${activeTab === "cadastro_massa" ? "bg-blue-50 text-blue-900" : "bg-slate-100 text-slate-500 group-hover:text-blue-900 group-hover:bg-blue-50/50"
                  }`}>
                  <FileSpreadsheet size={20} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold text-sm transition-colors ${activeTab === "cadastro_massa" ? "text-slate-800" : "text-slate-600 group-hover:text-slate-800"
                    }`}>Cadastro em Massa</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">Importar anúncios via Excel</p>
                </div>
              </button>
            </nav>
          </aside>

          {/* Área de Conteúdo principal */}
          <main className="flex-1 min-w-0 w-full">
            {activeTab === "cadastro_massa" ? (
              <CadastroMassa />
            ) : (
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
                          <div className="flex items-center gap-2 text-zinc-500 truncate">
                            <Package size={16} className="shrink-0" />
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
                      value={anuncioForm.dt_validade || ""}
                      error={fieldErrors.dt_validade}
                      onChange={(e) => {
                        setFieldErrors((prev) => ({ ...prev, dt_validade: "" }))
                        setAnuncioForm((prev) => ({ ...prev, dt_validade: e.target.value }))
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

                  {/* BLOCO 3: OBSERVAÇÕES COM BOTÃO DE IA EMBUTIDO */}
                  <div className="w-full">
                    <InputField
                      label="Observações do Anúncio"
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
                              showError("Atenção", "Por favor, selecione o Insumo e defina a quantidade antes de gerar a descrição por IA.")
                              return
                            }
                            setIsConfirmAIOpen(true)
                          }}
                          disabled={isGenerating}
                          className="text-xs flex items-center gap-2 text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 font-bold px-3 py-1.5 rounded-lg shadow-md transition-all duration-200 disabled:opacity-60 cursor-pointer border border-indigo-400/30"
                        >
                          {isGenerating ? (
                            <>
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              Gerando...
                            </>
                          ) : (
                            <>
                              <span className="flex items-center gap-1">
                                <Sparkles size={13} className="animate-pulse text-amber-300" />
                                Gerar com IA
                              </span>
                              <span className="bg-black/20 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 border border-white/10">
                                <Coins size={12} className="text-amber-300" />
                                1 Crédito
                              </span>
                            </>
                          )}
                        </button>
                      }
                    />
                  </div>

                  {/* BLOCO 4: IMAGEM DO ANÚNCIO */}
                  <div className="w-full flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Foto do Lote/Produto
                    </label>

                    {!anuncioForm.imagem_anuncio ? (
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <div className="w-10 h-10 mb-3 text-slate-400 bg-white shadow-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ImagePlus size={20} className="text-blue-900" />
                          </div>
                          <p className="mb-1 text-sm text-slate-600 font-semibold">
                            Clique para fazer upload
                          </p>
                          <p className="text-xs text-slate-500">
                            PNG, JPG ou WEBP (Max. 5MB)
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleImageUpload}
                        />
                      </label>
                    ) : (
                      <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 flex items-center justify-center">
                        <img
                          src={anuncioForm.imagem_anuncio}
                          alt="Preview"
                          className="w-full h-full object-cover opacity-90"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setAnuncioForm(prev => ({ ...prev, imagem_anuncio: "" }))}
                            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-red-700 transition-colors"
                          >
                            <X size={16} /> Remover Imagem
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="group w-full text-white font-bold py-4 rounded-xl flex items-center justify-between px-6 transition-all duration-300 shadow-lg shadow-blue-900/20 bg-blue-900 hover:bg-blue-950 mt-4 cursor-pointer overflow-hidden relative"
                  >
                    <span className="flex items-center gap-2 text-lg">
                      Publicar no Marketplace
                    </span>
                    <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl border border-white/10 group-hover:bg-white/30 transition-colors shadow-inner">
                      <Coins size={16} className="text-amber-300" />
                      <span className="text-sm font-black">5 Créditos</span>
                    </div>
                  </button>
                </form>
              </div>
            )}
          </main>
        </div>

        <Dialog open={isSuccessOpen} onOpenChange={(open) => {
          if (!open) handleCloseSuccess()
        }}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
            <DialogHeader className="m-0 bg-blue-900 px-6 py-5 rounded-t-xl border-b border-blue-950">
              <DialogTitle className="flex items-center gap-2 text-white text-xl font-black">
                <CheckCircle className="w-6 h-6" />
                Anúncio Publicado!
              </DialogTitle>
              <DialogDescription className="text-blue-100">
                Seu insumo agora está visível no catálogo para potenciais compradores.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6">
              {lastSaved && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-sm">
                  <p className="flex justify-between border-b border-slate-100 pb-2"><span className="font-semibold text-slate-500">Insumo</span> <span className="font-bold text-slate-800 text-right">{materiais.find(m => String(m.cd_mat) === String(lastSaved.cd_mat))?.ds_mat || "Insumo"}</span></p>
                  <p className="flex justify-between border-b border-slate-100 pb-2"><span className="font-semibold text-slate-500">Quantidade</span> <span className="font-bold text-slate-800 text-right">{lastSaved.qtd_mat} unid.</span></p>
                  <p className="flex justify-between border-b border-slate-100 pb-2"><span className="font-semibold text-slate-500">Valor Base</span> <span className="font-bold text-blue-900 text-right">R$ {lastSaved.val_base}</span></p>
                  {lastSaved.ds_lote && <p className="flex justify-between"><span className="font-semibold text-slate-500">Lote</span> <span className="font-bold text-slate-800 text-right">{lastSaved.ds_lote}</span></p>}
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseSuccess}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors w-full"
                >
                  Continuar Anunciando
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/catalogo")}
                  className="px-6 py-2.5 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-950 transition-colors w-full shadow-lg shadow-blue-900/20 cursor-pointer"
                >
                  Ir para o Catálogo
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL DE CONFIRMAÇÃO IA */}
        <Dialog open={isConfirmAIOpen} onOpenChange={setIsConfirmAIOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
            <DialogHeader className="m-0 bg-indigo-600 px-6 py-5 rounded-t-xl border-b border-indigo-700">
              <DialogTitle className="flex items-center gap-2 text-white text-xl font-black">
                <Sparkles className="w-6 h-6" />
                Gerar Descrição
              </DialogTitle>
              <DialogDescription className="text-indigo-100">
                Confirmação de Ação
              </DialogDescription>
            </DialogHeader>

            <div className="p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <p className="text-slate-600 text-sm font-medium leading-relaxed">
                  Usar inteligência artificial para criar uma descrição profissional para este insumo custa <span className="font-bold text-indigo-700 text-base">1 Crédito</span>.
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <button
                  type="button"
                  onClick={handleConfirmAI}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-black shadow-lg shadow-indigo-500/30 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} className="text-amber-300" /> Confirmar e Gerar
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmAIOpen(false)}
                  className="w-full py-2.5 bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL GENÉRICO DE AVISO/ERRO */}
        <Dialog open={errorModal.open} onOpenChange={(open) => setErrorModal(prev => ({ ...prev, open }))}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
            <DialogHeader className="m-0 bg-slate-900 px-6 py-5 rounded-t-xl border-b border-slate-950">
              <DialogTitle className="flex items-center gap-2 text-white text-xl font-black">
                <Megaphone className="w-5 h-5 text-amber-400" />
                {errorModal.title}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Mensagem do Sistema
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 text-center flex flex-col items-center">
              <p className="text-slate-600 mb-6 text-sm font-medium leading-relaxed">
                {errorModal.message}
              </p>
              
              <button
                type="button"
                onClick={() => setErrorModal(prev => ({ ...prev, open: false }))}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
              >
                Entendi
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL DE CONFIRMAÇÃO DE PUBLICAÇÃO */}
        <Dialog open={isConfirmPublishOpen} onOpenChange={setIsConfirmPublishOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
            <DialogHeader className="m-0 bg-blue-900 px-6 py-5 rounded-t-xl border-b border-blue-950">
              <DialogTitle className="flex items-center gap-2 text-white text-xl font-black">
                <Megaphone className="w-6 h-6" />
                Confirmar Publicação
              </DialogTitle>
              <DialogDescription className="text-blue-100">
                Revise os dados antes de tornar seu insumo público.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6">
              {lastSaved && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-sm mb-6">
                  <p className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-500">Insumo</span> 
                    <span className="font-bold text-slate-800 text-right">{materiais.find(m => String(m.cd_mat) === String(lastSaved.cd_mat))?.ds_mat || "Insumo"}</span>
                  </p>
                  <p className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-500">Quantidade</span> 
                    <span className="font-bold text-slate-800 text-right">{lastSaved.qtd_mat} unid.</span>
                  </p>
                  <p className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-500">Valor Base</span> 
                    <span className="font-bold text-slate-800 text-right">R$ {lastSaved.val_base}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-semibold text-slate-500">Custo da Ação</span> 
                    <span className="font-black text-amber-500 text-right flex items-center gap-1.5">
                      <Coins size={16} />
                      5 Créditos
                    </span>
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 w-full">
                <button
                  type="button"
                  onClick={handleConfirmPublish}
                  className="w-full py-3 bg-blue-900 text-white rounded-xl font-black shadow-lg shadow-blue-900/20 hover:bg-blue-950 transition-colors flex items-center justify-center gap-2"
                >
                  Confirmar e Descontar (5 Créditos)
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmPublishOpen(false)}
                  className="w-full py-2.5 bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL SEM CRÉDITOS */}
        <Dialog open={isInsufficientCreditsOpen} onOpenChange={setIsInsufficientCreditsOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
            <DialogHeader className="m-0 bg-amber-500 px-6 py-5 rounded-t-xl border-b border-amber-600">
              <DialogTitle className="flex items-center gap-2 text-white text-xl font-black">
                <DollarSign className="w-6 h-6" />
                Sem créditos!
              </DialogTitle>
              <DialogDescription className="text-amber-100">
                Saldo Insuficiente
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 text-center flex flex-col items-center">
              <p className="text-slate-600 mb-6 text-sm font-medium leading-relaxed">
                Você não possui saldo suficiente para {missingCreditsFeature}. <br />
                Adquira um pacote de créditos para continuar turbinando suas negociações.
              </p>
              
              <div className="flex flex-col gap-3 w-full">
                <button
                  type="button"
                  onClick={() => router.push("/creditos")}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-xl font-black shadow-lg shadow-amber-500/30 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Coins size={18} /> Ir para a Central de Créditos
                </button>
                <button
                  type="button"
                  onClick={() => setIsInsufficientCreditsOpen(false)}
                  className="w-full py-2.5 bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL DE CORTE DE IMAGEM */}
        <Dialog open={cropModalOpen} onOpenChange={(open) => {
          if (!open) {
            setCropModalOpen(false)
            setImageToCrop("")
          }
        }}>
          <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
            <DialogHeader className="m-0 bg-blue-900 px-6 py-5 rounded-t-xl border-b border-blue-950">
              <DialogTitle className="flex items-center gap-2 text-white text-xl font-black">
                <Crop className="w-5 h-5" />
                Ajustar Imagem do Produto
              </DialogTitle>
              <DialogDescription className="text-blue-100">
                Arraste a imagem e use o zoom para enquadrar da melhor forma.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6">
              <div className="relative w-full h-80 bg-slate-900 rounded-2xl overflow-hidden mb-6 shadow-inner">
                {imageToCrop && (
                  <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={16 / 9}
                    onCropChange={setCrop}
                    onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                    onZoomChange={setZoom}
                  />
                )}
              </div>

              <div className="flex items-center gap-4 px-2 mb-2">
                <ZoomIn className="w-5 h-5 text-slate-500" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-blue-900 cursor-pointer"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCropModalOpen(false)
                    setImageToCrop("")
                  }}
                  className="flex-1 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCrop}
                  className="flex-1 px-4 py-2.5 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-950 transition-colors shadow-lg shadow-blue-900/20 cursor-pointer"
                >
                  Cortar e Salvar Imagem
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}