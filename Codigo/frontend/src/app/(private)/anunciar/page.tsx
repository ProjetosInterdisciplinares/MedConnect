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
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{label}</label>
        {rightElement}
      </div>
      <div className="relative">
        <div className="absolute left-3 top-3 text-zinc-400">
          <Icon size={16} />
        </div>
        {props.type === "textarea" ? (
          <textarea
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-sm min-h-30 resize-y"
          />
        ) : (
          <input
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-sm"
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
      const response = await fetch("http://localhost:8000/api/gerar-anuncio/", {
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
    <div className="relative min-h-screen w-full antialiased selection:bg-teal-500/20">
      <AnimatedBackground />
      <div className="max-w-4xl mx-auto py-8 px-4 relative z-10">
        <div className="mb-8">
        <h1 className="text-2xl font-bold text-teal-800 flex items-center gap-2">
         Publicar Anúncio
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Selecione um insumo do seu estoque e defina as condições de negociação.
        </p>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>

          {/* BLOCO 1: SELEÇÃO DE INSUMO E LOTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Insumo (Obrigatório)</label>
              <Select
                value={anuncioForm.cd_mat ? String(anuncioForm.cd_mat) : ""}
                // CORREÇÃO 2: onValueChange agora chama handleMatChange
                onValueChange={handleMatChange}
                disabled={materiais.length === 0}
                required
              >
                <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm h-10">
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
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Lote (Obrigatório p/ IA)</label>
              <Select
                value={anuncioForm.nr_lote ? String(anuncioForm.nr_lote) : ""}
                onValueChange={(value) => setAnuncioForm((prev) => ({ ...prev, nr_lote: value === "SEM_LOTE" ? 0 : Number(value) }))}
                // Desabilitado até um insumo ser selecionado
                disabled={!anuncioForm.cd_mat}
                required
              >
                <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm h-10">
                  <div className="flex items-center gap-2 text-zinc-500">
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
                  className="text-xs flex items-center gap-1.5 text-zinc-50 font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-60 cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
                >
                  {isGenerating ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Foto do Lote/Produto (Opcional)
            </label>
            
            {!anuncioForm.imagem_anuncio ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="w-10 h-10 mb-3 text-zinc-400 bg-white shadow-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImagePlus size={20} className="text-teal-600" />
                  </div>
                  <p className="mb-1 text-sm text-zinc-600 font-semibold">
                    Clique para fazer upload
                  </p>
                  <p className="text-xs text-zinc-500">
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
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-zinc-200 shadow-sm bg-zinc-900 flex items-center justify-center">
                <img 
                  src={anuncioForm.imagem_anuncio} 
                  alt="Preview" 
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setAnuncioForm(prev => ({ ...prev, imagem_anuncio: "" }))}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-red-700 transition-colors"
                  >
                    <X size={16} /> Remover Imagem
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg mt-4 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
          >
            Publicar no Marketplace
          </button>
        </form>
      </div>

      <Dialog open={isSuccessOpen} onOpenChange={(open) => {
        if (!open) handleCloseSuccess()
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700 text-xl">
              <CheckCircle className="w-6 h-6" />
              Anúncio Publicado!
            </DialogTitle>
            <DialogDescription>
              Seu insumo agora está visível no catálogo para potenciais compradores.
            </DialogDescription>
          </DialogHeader>
          {lastSaved && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 mt-2 text-sm">
              <p><span className="font-semibold text-slate-600">Insumo:</span> {materiais.find(m => String(m.cd_mat) === String(lastSaved.cd_mat))?.ds_mat}</p>
              <p><span className="font-semibold text-slate-600">Quantidade:</span> {lastSaved.qtd_mat} unidades</p>
              <p><span className="font-semibold text-slate-600">Valor Base:</span> R$ {lastSaved.val_base}</p>
              {lastSaved.ds_lote && <p><span className="font-semibold text-slate-600">Lote Vinculado:</span> {lastSaved.ds_lote}</p>}
            </div>
          )}
          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={handleCloseSuccess}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition-colors w-full sm:w-auto cursor-pointer"
            >
              Ir para o Catálogo
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CORTE DE IMAGEM */}
      <Dialog open={cropModalOpen} onOpenChange={(open) => {
        if (!open) {
          setCropModalOpen(false)
          setImageToCrop("")
        }
      }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700 text-xl">
              <Crop className="w-5 h-5" />
              Ajustar Imagem do Produto
            </DialogTitle>
            <DialogDescription>
              Arraste a imagem e use o zoom para enquadrar da melhor forma. 
            </DialogDescription>
          </DialogHeader>

          <div className="relative w-full h-80 bg-zinc-900 rounded-xl overflow-hidden my-4">
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
          
          <div className="flex items-center gap-4 px-2">
            <ZoomIn className="w-5 h-5 text-zinc-500" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
          </div>

          <DialogFooter className="mt-4 gap-2">
            <button
              type="button"
              onClick={() => {
                setCropModalOpen(false)
                setImageToCrop("")
              }}
              className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded-lg font-bold hover:bg-zinc-300 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveCrop}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition-colors cursor-pointer"
            >
              Cortar e Salvar Imagem
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}
