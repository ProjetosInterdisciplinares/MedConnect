"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Megaphone, Package, Layers, Hash, DollarSign, FileText, Sparkles, CheckCircle, ImagePlus, X, Crop, ZoomIn } from "lucide-react"
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
import servicesGetLotes from "@/server/(GET)-lotes"
import servicesCreateAnuncio from "@/server/(POST)-anuncio"
import { CreateAnuncioForm, MatMed } from "@/types"
import AnimatedBackground from "@/components/ui/animated-background"


// CORREÇÃO 1: Adicionado ds_lote na interface
interface Lote {
  nr_lote: number
  ds_lote: string
  dt_validade: string
  cd_material: number
  ie_status: string
}

const InputField = ({
    label,
    icon: Icon,
    rightElement,
    ...props
  }: {
    label: string
    icon: React.ElementType
    rightElement?: React.ReactNode
  } & React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        {rightElement}
      </div>
      <div className="relative">
        <div className="absolute left-3 top-3 text-slate-400">
          <Icon size={16} />
        </div>
        {props.type === "textarea" ? (
          <textarea
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all text-sm min-h-30 resize-y"
          />
        ) : (
          <input
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all text-sm"
          />
        )}
      </div>
    </div>
  )
  
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

export default function PublicarAnuncioPage() {
  const router = useRouter()
  const [materiais, setMateriais] = useState<MatMed[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const [anuncioForm, setAnuncioForm] = useState({
    cd_mat: 0,
    nr_lote: 0,
    ds_lote: "",
    qtd_mat: 0,
    val_base: "",
    ds_obs: "",
    cd_pessoa_anunciante: 0,
    imagem_anuncio: "",
  })

  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<CreateAnuncioForm | null>(null)

  // Estados do Cropper
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string>("")
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  useEffect(() => {
    const userId = Number(localStorage.getItem("userId") || 0)
    setAnuncioForm((prev) => ({ ...prev, cd_pessoa_anunciante: userId }))

    async function fetchData() {
      const responseMateriais = await servicesGetMatMed()
      if (responseMateriais && !("isError" in responseMateriais)) {
        setMateriais(responseMateriais)
      }
    }

    fetchData()
  }, [])

  // CORREÇÃO 2: Fetch dos lotes filtrado pelo insumo selecionado
  function handleMatChange(value: string | null) {
    if (!value) {
      setAnuncioForm((prev) => ({ ...prev, cd_mat: 0, nr_lote: 0 }))
      setLotes([])
      return
    }

    const cdMat = Number(value)
    setAnuncioForm((prev) => ({ ...prev, cd_mat: cdMat, nr_lote: 0 }))
    setLotes([])

    fetchLotes(cdMat)
  }

  async function fetchLotes(cdMat: number) {
  const responseLotes = await servicesGetLotes()

  if (responseLotes && !("isError" in responseLotes)) {

    const hoje = new Date()

    const lotesFiltrados = responseLotes.filter(
      (lote) =>
        lote.cd_material === cdMat &&
        lote.ie_status === "A" &&
        new Date(lote.dt_validade) >= hoje
    )

    setLotes(lotesFiltrados)
  }
}

  async function handleGenerateAIDescription() {
    if (!anuncioForm.cd_mat || !anuncioForm.nr_lote || !anuncioForm.qtd_mat) {
      alert("Por favor, selecione o Insumo, o Lote e defina a quantidade antes de gerar a descrição por IA.")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/gerar-anuncio/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cd_mat: anuncioForm.cd_mat,
          nr_lote: anuncioForm.nr_lote,
          ds_lote: lotes.find((l) => l.nr_lote === anuncioForm.nr_lote)?.ds_lote || "",
          cd_pessoa_anunciante: anuncioForm.cd_pessoa_anunciante,
          qtd_mat: anuncioForm.qtd_mat,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.erro || "Erro interno ao processar a descrição.")
      }

      const data = await response.json()
      if (data.texto_sugerido) {
        setAnuncioForm((prev) => ({ ...prev, ds_obs: data.texto_sugerido }))
      }
    } catch (error: any) {
      console.error("Erro na geração por IA:", error)
      alert(error.message || "Não foi possível gerar a descrição automática no momento.")
    } finally {
      setIsGenerating(false)
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Limita tamanho para 5MB aproximadamente (5 * 1024 * 1024)
    if (file.size > 5242880) {
      alert("A imagem selecionada é muito grande. O limite máximo é de 5MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64String = event.target?.result as string
      setImageToCrop(base64String)
      setCropModalOpen(true)
    }
    reader.onerror = () => {
      alert("Não foi possível ler o arquivo de imagem.")
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
        alert("Erro ao cortar a imagem")
      }
    }
  }


  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const valorTratadoString = anuncioForm.val_base.replace(",", ".").trim()

    const selectedLote = lotes.find((l) => l.nr_lote === anuncioForm.nr_lote) || null

    const dataToSend: CreateAnuncioForm = {
      cd_mat: anuncioForm.cd_mat,
      nr_lote: anuncioForm.nr_lote === 0 ? null : anuncioForm.nr_lote,
      ds_lote: selectedLote ? selectedLote.ds_lote : null,
      qtd_mat: anuncioForm.qtd_mat,
      val_base: valorTratadoString || "0.00",
      ds_obs: anuncioForm.ds_obs,
      imagem_anuncio: anuncioForm.imagem_anuncio || undefined,
      cd_pessoa_anunciante: anuncioForm.cd_pessoa_anunciante,
    }

    const response = await (servicesCreateAnuncio as any)(dataToSend)

    if (response && "isError" in response) {
      console.error("Erro ao criar anúncio:", response.message)
      alert("Falha ao publicar o anúncio. Tente novamente.")
      return
    }

    setLastSaved(dataToSend)
    setIsSuccessOpen(true)
  }

  function handleCloseSuccess() {
    setIsSuccessOpen(false)
    router.push("/catalogo")
  }

  const lotesFiltrados = lotes.filter(
  (lote) =>
    lote.cd_material === anuncioForm.cd_mat
  )

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
            Selecione um insumo do seu estoque e defina as condições de negociação para publicá-lo no catálogo B2B.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            <nav className="flex flex-col gap-2">
              <button
                type="button"
                className="relative w-full text-left flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 group bg-white shadow-sm ring-1 ring-slate-200/50"
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-900 rounded-r-full" />
                <div className="shrink-0 rounded-xl p-2 transition-colors bg-blue-50 text-blue-900">
                  <Megaphone size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-sm">Publicar Anúncio</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">Criar nova oferta de venda</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => router.push("/catalogo")}
                className="relative w-full text-left flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 group hover:bg-white/50"
              >
                <div className="shrink-0 rounded-xl p-2 transition-colors bg-slate-100 text-slate-500 group-hover:text-blue-900 group-hover:bg-blue-50/50">
                  <Package size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-600 group-hover:text-slate-800 text-sm transition-colors">Meus Anúncios</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">Ver suas publicações no catálogo</p>
                </div>
              </button>
            </nav>
          </aside>

          {/* Área de Conteúdo principal */}
          <main className="flex-1 min-w-0">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
              
              <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-800">Formulário de Publicação</h2>
                <p className="text-sm text-slate-500 mt-1">Preencha os detalhes do produto que deseja vender.</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>

                {/* BLOCO 1: SELEÇÃO DE INSUMO E LOTE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">Insumo (Obrigatório)</label>
                    <Select
                      value={anuncioForm.cd_mat ? String(anuncioForm.cd_mat) : ""}
                      onValueChange={handleMatChange}
                      disabled={materiais.length === 0}
                      required
                    >
                      <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl text-sm h-[42px] focus:ring-blue-900/20 focus:border-blue-900">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Package size={16} />
                    <SelectValue placeholder="Selecione o insumo cadastrado">
                      {anuncioForm.cd_mat
                        ? materiais.find(m => String(m.cd_mat) === String(anuncioForm.cd_mat))?.ds_mat
                        : undefined}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Insumos Disponíveis</SelectLabel>
                    {materiais.map((mat) => (
                      <SelectItem key={mat.cd_mat} value={String(mat.cd_mat)}>{mat.ds_mat}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">Lote (Obrigatório p/ IA)</label>
                    <Select
                      value={anuncioForm.nr_lote ? String(anuncioForm.nr_lote) : ""}
                      onValueChange={(value) => setAnuncioForm((prev) => ({ ...prev, nr_lote: value === "SEM_LOTE" ? 0 : Number(value) }))}
                      disabled={!anuncioForm.cd_mat}
                      required
                    >
                      <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl text-sm h-[42px] focus:ring-blue-900/20 focus:border-blue-900">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Layers size={16} />
                    <SelectValue placeholder={anuncioForm.cd_mat ? "Selecione um lote" : "Selecione um insumo primeiro"}>
                      {anuncioForm.nr_lote
                        ? anuncioForm.nr_lote === 0 
                          ? "Nenhum lote específico" 
                          : (() => {
                              const found = lotesFiltrados.find(l => String(l.nr_lote) === String(anuncioForm.nr_lote))
                              return found ? `${found.ds_lote} — vence ${new Date(found.dt_validade).toLocaleDateString("pt-BR")}` : undefined
                            })()
                        : undefined}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="SEM_LOTE">Nenhum lote específico</SelectItem>
                    {/* CORREÇÃO 3: Exibindo ds_lote e dt_validade */}
                    {lotesFiltrados.map((lote) => (
                      <SelectItem key={lote.nr_lote} value={String(lote.nr_lote)}>
                        {lote.ds_lote} — vence {new Date(lote.dt_validade).toLocaleDateString("pt-BR")}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
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
              onChange={(e) => setAnuncioForm((prev) => ({ ...prev, qtd_mat: Number(e.target.value) }))}
            />

            <InputField
              label="Valor Base (R$)"
              icon={DollarSign}
              type="text"
              required
              placeholder="Ex: 15,90"
              value={anuncioForm.val_base}
              onChange={(e) => setAnuncioForm((prev) => ({ ...prev, val_base: e.target.value }))}
            />
          </div>

          {/* BLOCO 3: OBSERVAÇÕES COM BOTÃO DE IA EMBUTIDO */}
          <div className="w-full">
            <InputField
              label="Observações do Anúncio (Opcional)"
              icon={FileText}
              type="textarea"
              placeholder="Ex: Caixas levemente amassadas, mas produto intacto..."
              value={anuncioForm.ds_obs}
              onChange={(e) => setAnuncioForm((prev) => ({ ...prev, ds_obs: e.target.value }))}
              rightElement={
                <button
                  type="button"
                  onClick={handleGenerateAIDescription}
                  disabled={isGenerating}
                  className="text-xs flex items-center gap-1.5 text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-100 font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-60 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <span className="w-3 h-3 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></span>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="animate-pulse" />
                      Gerar Descrição com IA
                    </>
                  )}
                </button>
              }
            />
          </div>

                {/* BLOCO 4: IMAGEM DO ANÚNCIO */}
                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Foto do Lote/Produto (Opcional)
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
                  className="w-full text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-md shadow-blue-900/20 bg-blue-900 hover:bg-blue-950 mt-4 cursor-pointer"
                >
                  Publicar no Marketplace
                </button>
              </form>
            </div>
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
                <p className="flex justify-between border-b border-slate-100 pb-2"><span className="font-semibold text-slate-500">Insumo</span> <span className="font-bold text-slate-800 text-right">{materiais.find(m => String(m.cd_mat) === String(lastSaved.cd_mat))?.ds_mat}</span></p>
                <p className="flex justify-between border-b border-slate-100 pb-2"><span className="font-semibold text-slate-500">Quantidade</span> <span className="font-bold text-slate-800 text-right">{lastSaved.qtd_mat} unid.</span></p>
                <p className="flex justify-between border-b border-slate-100 pb-2"><span className="font-semibold text-slate-500">Valor Base</span> <span className="font-bold text-blue-900 text-right">R$ {lastSaved.val_base}</span></p>
                {lastSaved.ds_lote && <p className="flex justify-between"><span className="font-semibold text-slate-500">Lote</span> <span className="font-bold text-slate-800 text-right">{lastSaved.ds_lote}</span></p>}
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleCloseSuccess}
                className="px-6 py-2.5 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-950 transition-colors w-full shadow-lg shadow-blue-900/20 cursor-pointer"
              >
                Ir para o Catálogo
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
                  aspect={16 / 9} // Ou o aspect ratio desejado para o card (ex: 4/3 ou 16/9)
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