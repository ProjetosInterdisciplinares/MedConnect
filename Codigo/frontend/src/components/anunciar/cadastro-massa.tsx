"use client"

import { ModalPadrao, BOTAO } from "@/components/ui/modal-padrao"
import { useRouter } from "next/navigation"

import React, { useState, useCallback } from "react"
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  Sparkles,
  HelpCircle,
  Info,
  ImagePlus,
  Coins,
  Megaphone,
  DollarSign,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { buildUrl, getAuthHeaders } from "@/server/middleware"
import { AuthManager } from "@/lib/AuthManager"
import servicesGetCreditosSaldo from "@/server/(GET)-creditos-saldo"
import { notificarCreditosAtualizados } from "@/lib/creditos"
import { rotuloCreditos, useCustosCreditos } from "@/hooks/useCustosCreditos"

// ── Types ────────────────────────────────────────────────────────────
interface BulkInsumo {
  ds_mat: string
  ds_tipo: string
  ds_marca: string
  unidade_med: string
  cd_tuss: string
  cd_simpro?: string | null
  cd_brasindice?: string | null
}

interface BulkAnuncio {
  ds_lote: string
  dt_fabricacao: string | null
  dt_validade: string | null
  qtd_mat: number | null
  val_base: string | null
  ds_obs: string
  imagem_anuncio?: string | null
  val_minimo?: string | null
  ie_aceita_parcial?: boolean
}

interface BulkAdRow {
  linha: number
  index: number
  publicar: boolean
  valido: boolean
  erros: string[]
  insumo_existente: boolean
  insumo_cd_mat: number | null
  insumo: BulkInsumo
  anuncio: BulkAnuncio
}

interface ValidationResponse {
  total: number
  total_validos: number
  total_invalidos: number
  total_novos_insumos: number
  anuncios: BulkAdRow[]
}

interface PublishResponse {
  mensagem: string
  total_criados: number
  anuncios: Array<{
    nr_anuncio: number
    ds_mat: string
    ds_lote: string
    qtd_mat: number
    val_base: string
  }>
}

// ── Component ────────────────────────────────────────────────────────
export default function CadastroMassa() {
  const { publicacao: custoPorAnuncio } = useCustosCreditos()
  const custoDoLote = (quantidade: number) =>
    rotuloCreditos(custoPorAnuncio === null ? null : quantidade * custoPorAnuncio)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [validationData, setValidationData] = useState<ValidationResponse | null>(null)
  const [adRows, setAdRows] = useState<BulkAdRow[]>([])
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string>("")
  const [publishError, setPublishError] = useState<string>("")
  const [publishSuccess, setPublishSuccess] = useState<PublishResponse | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [fileName, setFileName] = useState<string>("")
  const router = useRouter()
  const [isConfirmPublishOpen, setIsConfirmPublishOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isInsufficientCreditsOpen, setIsInsufficientCreditsOpen] = useState(false)

  // ── Download template ──────────────────────────────────────────────
  async function handleDownloadTemplate() {
    try {
      const token = AuthManager.getInstance().getToken()
      const response = await fetch(buildUrl("/api/medconnect/anuncio/bulk/template/"), {
        method: "GET",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      })

      if (!response.ok) throw new Error("Erro ao baixar o template")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "template_anuncios_massa.xlsx"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert("Não foi possível baixar o template. Tente novamente.")
    }
  }

  // ── Upload and validate ────────────────────────────────────────────
  async function handleFileUpload(file: File) {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setUploadError("Formato inválido. Envie um arquivo .xlsx (Excel).")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Arquivo muito grande. O limite máximo é 10MB.")
      return
    }

    setUploading(true)
    setUploadError("")
    setValidationData(null)
    setAdRows([])
    setPublishSuccess(null)
    setPublishError("")
    setFileName(file.name)

    try {
      const token = AuthManager.getInstance().getToken()
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(buildUrl("/api/medconnect/anuncio/bulk/validate/"), {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        const msg = data.erro || data.detail || data.message || JSON.stringify(data)
        setUploadError(`Erro ao processar: ${msg}`)
        return
      }

      setValidationData(data)
      setAdRows(data.anuncios)
    } catch (err: any) {
      setUploadError(`Erro de conexão: ${err?.message || "Não foi possível conectar ao servidor."}`)
    } finally {
      setUploading(false)
    }
  }

  // ── Drag and Drop handlers ─────────────────────────────────────────
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  // ── Toggle publish flag ─────────────────────────────────────────────
  function togglePublish(index: number) {
    setAdRows((prev) =>
      prev.map((row) =>
        row.index === index ? { ...row, publicar: !row.publicar } : row
      )
    )
  }

  // ── Row image upload ────────────────────────────────────────────────
  async function handleRowImageUpload(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione uma imagem válida.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setAdRows((prev) =>
        prev.map((row) =>
          row.index === index
            ? { ...row, anuncio: { ...row.anuncio, imagem_anuncio: base64 } }
            : row
        )
      )
    }
    reader.readAsDataURL(file)
  }

  // ── Publish all ─────────────────────────────────────────────────────
  async function handlePublishAll() {
    const toPublish = adRows.filter((r) => r.publicar && r.valido)

    if (toPublish.length === 0) {
      setPublishError("Nenhum anúncio válido selecionado para publicar.")
      return
    }

    setPublishing(true)
    setPublishError("")
    try {
      const token = AuthManager.getInstance().getToken()
      const payload = toPublish.map((row) => ({
        insumo: row.insumo,
        anuncio: row.anuncio,
      }))

      const response = await fetch(buildUrl("/api/medconnect/anuncio/bulk/publish/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        setIsConfirmPublishOpen(false)
        if (response.status === 402) {
          setIsInsufficientCreditsOpen(true)
          return
        }
        
        const msg = data.erro || data.detail || data.message || JSON.stringify(data)
        const detalhes = data.detalhes
          ? `\n\nDetalhes: ${data.detalhes.map((d: any) => `Anúncio ${(d.index ?? 0) + 1}: ${d.erro}`).join("; ")}`
          : ""
        setPublishError(`${msg}${detalhes}`)
        return
      }

      setPublishSuccess(data)
      setIsConfirmPublishOpen(false)
      setIsSuccessModalOpen(true)
      
      servicesGetCreditosSaldo().then(res => {
        if (!("isError" in res)) notificarCreditosAtualizados(res.saldo)
      })
    } catch (err: any) {
      setPublishError(`Erro de conexão: ${err?.message || "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."}`)
      setIsConfirmPublishOpen(false)
    } finally {
      setPublishing(false)
    }
  }

  // ── Reset ───────────────────────────────────────────────────────────
  function handleReset() {
    setValidationData(null)
    setAdRows([])
    setUploadError("")
    setPublishError("")
    setPublishSuccess(null)
    setFileName("")
  }

  // ── Computed values ─────────────────────────────────────────────────
  const totalToPublish = adRows.filter((r) => r.publicar && r.valido).length
  const totalValid = adRows.filter((r) => r.valido).length
  const totalInvalid = adRows.filter((r) => !r.valido).length
  const totalNewInsumos = adRows.filter((r) => !r.insumo_existente && r.valido && r.publicar).length

  return (
    <div className="space-y-6">
      {validationData && adRows.length > 0 ? (
        /* ─── Preview State ────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium mb-1">Total de Linhas</p>
              <p className="text-2xl font-black text-slate-800">{validationData.total}</p>
            </div>
            <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-emerald-600 font-medium mb-1">Válidos</p>
              <p className="text-2xl font-black text-emerald-600">{totalValid}</p>
            </div>
            <div className="bg-white border border-red-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-red-500 font-medium mb-1">Com Erros</p>
              <p className="text-2xl font-black text-red-500">{totalInvalid}</p>
            </div>
            <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-amber-600 font-medium mb-1">Novos Insumos</p>
              <p className="text-2xl font-black text-amber-600">{totalNewInsumos}</p>
            </div>
          </div>

          {/* File info and actions */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <FileSpreadsheet size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{fileName}</p>
                <p className="text-xs text-slate-500">
                  {totalToPublish} de {totalValid} anúncio(s) válidos selecionados para publicação
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Trash2 size={14} /> Limpar
              </button>
            </div>
          </div>

          {/* Ads Table */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="bg-blue-900 px-6 py-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Eye size={18} /> Prévia dos Anúncios
              </h3>
              <p className="text-blue-200 text-sm mt-1">
                Revise cada anúncio. Desmarque os que não deseja publicar.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {adRows.map((row) => (
                <div
                  key={row.index}
                  className={`transition-all duration-300 ${
                    !row.valido
                      ? "bg-red-50/50"
                      : row.publicar
                      ? "bg-white hover:bg-slate-50/50"
                      : "bg-slate-50/80 opacity-50"
                  }`}
                >
                  {/* Main Row */}
                  <div className="px-6 py-4 flex items-center gap-4">
                    {/* Checkbox */}
                    <label className="relative flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={row.publicar && row.valido}
                        disabled={!row.valido}
                        onChange={() => togglePublish(row.index)}
                        className="peer sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                          !row.valido
                            ? "border-red-300 bg-red-50 cursor-not-allowed"
                            : row.publicar
                            ? "border-blue-900 bg-blue-900"
                            : "border-slate-300 bg-white hover:border-blue-400"
                        }`}
                      >
                        {row.publicar && row.valido && (
                          <CheckCircle size={12} className="text-white" />
                        )}
                        {!row.valido && (
                          <XCircle size={12} className="text-red-400" />
                        )}
                      </div>
                    </label>

                    {/* Status icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        !row.valido
                          ? "bg-red-100"
                          : row.insumo_existente
                          ? "bg-emerald-50"
                          : "bg-amber-50"
                      }`}
                    >
                      {!row.valido ? (
                        <XCircle size={16} className="text-red-500" />
                      ) : row.insumo_existente ? (
                        <CheckCircle size={16} className="text-emerald-500" />
                      ) : (
                        <Sparkles size={16} className="text-amber-500" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {row.insumo.ds_mat || "(Sem nome)"}
                        </p>
                        {!row.insumo_existente && row.valido && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
                            NOVO INSUMO
                          </span>
                        )}
                        {!row.valido && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">
                            ERRO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                        <span>Linha {row.linha}</span>
                        <span>·</span>
                        <span>Lote: {row.anuncio.ds_lote || "—"}</span>
                        <span>·</span>
                        <span>Qtd: {row.anuncio.qtd_mat ?? "—"}</span>
                        <span>·</span>
                        <span className="font-bold text-blue-900">
                          R$ {row.anuncio.val_base || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Expand button */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRow(expandedRow === row.index ? null : row.index)
                      }
                      className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    >
                      {expandedRow === row.index ? (
                        <ChevronUp size={16} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedRow === row.index && (
                    <div className="px-6 pb-5 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Errors */}
                      {row.erros.length > 0 && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                          <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                            <AlertTriangle size={12} /> Erros encontrados:
                          </p>
                          <ul className="space-y-1">
                            {row.erros.map((err, i) => (
                              <li key={i} className="text-xs text-red-600 flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                {err}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Insumo details */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <h4 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1">
                            <Package size={12} /> Dados do Insumo
                            {row.insumo_existente ? (
                              <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-600 rounded-full">
                                JÁ CADASTRADO
                              </span>
                            ) : (
                              <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-600 rounded-full">
                                SERÁ CRIADO
                              </span>
                            )}
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Nome</span>
                              <span className="font-semibold text-slate-800">{row.insumo.ds_mat || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Categoria</span>
                              <span className="font-semibold text-slate-800">{row.insumo.ds_tipo || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Marca</span>
                              <span className="font-semibold text-slate-800">{row.insumo.ds_marca || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Unidade</span>
                              <span className="font-semibold text-slate-800">{row.insumo.unidade_med || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">TUSS</span>
                              <span className="font-semibold text-slate-800">{row.insumo.cd_tuss || "—"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Ad details */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <h4 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1">
                            <FileSpreadsheet size={12} /> Dados do Anúncio
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Lote</span>
                              <span className="font-semibold text-slate-800">{row.anuncio.ds_lote || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Fabricação</span>
                              <span className="font-semibold text-slate-800">{row.anuncio.dt_fabricacao || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Validade</span>
                              <span className="font-semibold text-slate-800">{row.anuncio.dt_validade || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Quantidade</span>
                              <span className="font-semibold text-slate-800">{row.anuncio.qtd_mat ?? "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Valor Base</span>
                              <span className="font-bold text-blue-900">R$ {row.anuncio.val_base || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Valor mínimo</span>
                              <span className="font-semibold text-slate-800">{row.anuncio.val_minimo ? `R$ ${row.anuncio.val_minimo}` : "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Compra parcial</span>
                              <span className="font-semibold text-slate-800">{row.anuncio.ie_aceita_parcial === false ? "Não aceita" : "Aceita"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Observações</span>
                              <span className="font-semibold text-slate-800 text-right max-w-[200px] truncate">
                                {row.anuncio.ds_obs || "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Photo details */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 col-span-1 md:col-span-2">
                          <h4 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1">
                            <ImagePlus size={12} /> Foto do Anúncio (Opcional)
                          </h4>
                          <div className="flex items-center gap-4">
                            {row.anuncio.imagem_anuncio ? (
                              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                                <img src={row.anuncio.imagem_anuncio} alt="Prévia" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdRows(prev => prev.map(r => r.index === row.index ? { ...r, anuncio: { ...r.anuncio, imagem_anuncio: null } } : r))
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                >
                                  <XCircle size={14} />
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors shrink-0">
                                <ImagePlus size={20} className="text-slate-400 mb-1" />
                                <span className="text-[10px] font-bold text-slate-500 text-center px-1">Adicionar Foto</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleRowImageUpload(row.index, e)}
                                />
                              </label>
                            )}
                            <div className="flex-1">
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Você pode adicionar uma foto real do produto para este anúncio antes de publicar. Recomendamos fotos bem iluminadas do lote/caixa original.
                              </p>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Confirmation Bar */}
          <div className="space-y-4">
            {publishError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-800">Erro na publicação</h4>
                  <p className="text-sm text-red-600 mt-1 whitespace-pre-wrap">{publishError}</p>
                </div>
              </div>
            )}
            
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-500" />
                  Deseja realmente publicar os anúncios?
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {totalToPublish} anúncio(s) selecionados serão publicados no catálogo.
                  {totalNewInsumos > 0 && (
                    <span className="text-amber-600 font-semibold">
                      {" "}{totalNewInsumos} novo(s) insumo(s) serão cadastrados automaticamente.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
              {totalToPublish > 0 && !publishing && (
                <span className="text-sm text-slate-500 whitespace-nowrap">
                  Custo: <span className="font-semibold text-slate-700 tabular-nums">{custoDoLote(totalToPublish)}</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsConfirmPublishOpen(true)}
                disabled={publishing || totalToPublish === 0}
                className="h-11 px-6 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {publishing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Publicando…
                  </>
                ) : (
                  <>
                    <Upload size={16} aria-hidden="true" />
                    Publicar todos ({totalToPublish})
                  </>
                )}
              </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      ) : (
        /* ─── Upload State ─────────────────────────────────────────── */
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Importação em Massa</h2>
            <p className="text-sm text-slate-500 mt-1">
              Importe múltiplos anúncios de uma vez usando uma planilha Excel.
            </p>
          </div>

          {/* Step 1: Download Template */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-sm font-black">
                1
              </div>
              <h3 className="font-bold text-slate-800">Baixe o Template</h3>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={24} className="text-blue-900" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">template_anuncios_massa.xlsx</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Planilha com colunas para dados de insumo + anúncio. Inclui aba de tutorial.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTutorial(true)}
                    className="px-4 py-2.5 text-sm font-bold text-blue-900 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <HelpCircle size={16} /> Tutorial
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-4 py-2.5 text-sm font-bold text-white bg-blue-900 rounded-xl hover:bg-blue-950 transition-colors shadow-md shadow-blue-900/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Download size={16} /> Baixar Template
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Upload */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-sm font-black">
                2
              </div>
              <h3 className="font-bold text-slate-800">Faça o Upload da Planilha</h3>
            </div>

            {uploadError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <XCircle size={16} className="shrink-0" />
                {uploadError}
              </div>
            )}

            <label
              className={`flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-2xl transition-all cursor-pointer group ${
                dragActive
                  ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                  : uploading
                  ? "border-blue-300 bg-blue-50/30"
                  : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={40} className="text-blue-900 animate-spin" />
                  <p className="text-sm font-bold text-blue-900">Processando planilha...</p>
                  <p className="text-xs text-slate-500">Validando dados e verificando insumos</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-14 h-14 mb-4 text-slate-400 bg-white shadow-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={24} className="text-blue-900" />
                  </div>
                  <p className="mb-1 text-sm text-slate-600 font-semibold">
                    {dragActive ? "Solte o arquivo aqui" : "Clique ou arraste o arquivo Excel"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Arquivo .xlsx (Max. 10MB)
                  </p>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleInputChange}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Info panel */}
          <div className="mt-6 bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
              <Info size={16} className="text-blue-900" /> Como funciona
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-black text-blue-900">1</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">Preencha a planilha</p>
                  <p className="text-xs text-slate-500">Use o template com seus dados de insumo e anúncio</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-black text-blue-900">2</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">Revise a prévia</p>
                  <p className="text-xs text-slate-500">Confira os dados e selecione quais anúncios publicar</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-black text-blue-900">3</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">Publique em massa</p>
                  <p className="text-xs text-slate-500">Todos os anúncios selecionados serão criados de uma vez</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tutorial Modal ─────────────────────────────────────────── */}
      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="sm:max-w-2xl p-6 gap-0 bg-white max-h-[85vh] overflow-y-auto">
          <DialogTitle className="text-lg font-semibold text-slate-900">Como preencher a planilha</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-600">
            Campos da planilha de importação em massa e as regras aplicadas na publicação.
          </DialogDescription>

          <div className="mt-5 space-y-6">
            {/* Required Fields */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="text-red-500">*</span> Campos obrigatórios
              </h3>
              <div className="space-y-2">
                {[
                  { field: "Nome do Insumo", desc: "Nome do material ou medicamento" },
                  { field: "Categoria", desc: "'Material Hospitalar' ou 'Medicamento'" },
                  { field: "Marca", desc: "Fabricante do insumo" },
                  { field: "Unidade de Medida", desc: "Só a unidade, sem quantidade. Ex: Caixa, Unidade, Frasco" },
                  { field: "Código TUSS", desc: "Código TUSS de até 8 dígitos (material e medicamento)" },
                  { field: "Lote", desc: "Identificação do lote. Ex: L123456" },
                  { field: "Data de Fabricação", desc: "Formato DD/MM/AAAA" },
                  { field: "Data de Validade", desc: "Formato DD/MM/AAAA" },
                  { field: "Quantidade", desc: "Número inteiro positivo" },
                  { field: "Valor Base R$", desc: "Valor total do lote. Use vírgula para decimais. Ex: 1590,00" },
                  { field: "Observações", desc: "Descrição do anúncio" },
                ].map((item) => (
                  <div key={item.field} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-slate-200">
                    <span className="text-red-500 font-bold text-sm mt-0.5">*</span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.field}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Fields */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Campos opcionais</h3>
              <div className="space-y-2">
                {[
                  { field: "Código SIMPRO", desc: "Código de precificação do material" },
                  { field: "Código Brasíndice", desc: "Código de precificação de medicamento" },
                  { field: "Valor Mínimo Aceito R$", desc: "Menor valor aceito pelo lote; propostas abaixo são recusadas" },
                  { field: "Aceita Compra Parcial", desc: "'Sim' (padrão) ou 'Não'" },
                ].map((item) => (
                  <div key={item.field} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-bold text-sm mt-0.5">○</span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.field}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600" aria-hidden="true" /> Regras importantes
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  Se o insumo (mesmo nome + TUSS) já existir no seu cadastro, ele será reutilizado automaticamente.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  Caso contrário, o insumo será criado automaticamente junto com o anúncio.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  Linhas com erros não serão publicadas, mas não impedem as demais.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  Linhas completamente vazias são ignoradas.
                </li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE PUBLICAÇÃO */}
      <Dialog open={isConfirmPublishOpen} onOpenChange={setIsConfirmPublishOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md p-6 gap-0 bg-white">
          <DialogTitle className="text-lg font-semibold text-slate-900">Publicar {totalToPublish} anúncios?</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-600">
            Os créditos são descontados do seu saldo na publicação.
          </DialogDescription>
          <dl className="mt-5 rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
            {[
              ["Anúncios selecionados", String(totalToPublish)],
              ["Novos insumos", String(totalNewInsumos)],
              ["Custo total", custoDoLote(totalToPublish)],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500">{rotulo}</dt>
                <dd className="font-medium text-slate-900 tabular-nums">{valor}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmPublishOpen(false)}
              disabled={publishing}
              className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePublishAll}
              disabled={publishing}
              className="h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {publishing ? (<><Loader2 size={16} className="animate-spin" /> Publicando…</>) : `Publicar (${custoDoLote(totalToPublish)})`}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL SEM CRÉDITOS */}
      <Dialog open={isInsufficientCreditsOpen} onOpenChange={setIsInsufficientCreditsOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md p-6 gap-0 bg-white">
          <DialogTitle className="text-lg font-semibold text-slate-900">Saldo insuficiente</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-600 leading-relaxed">
            Você não tem créditos suficientes para publicar esses anúncios. Compre um pacote na Central de Créditos para continuar.
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsInsufficientCreditsOpen(false)}
              disabled={publishing}
              className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={() => router.push("/creditos")}
              disabled={publishing}
              className="h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              Ver pacotes de créditos
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL SUCESSO PUBLICAÇÃO */}
      <ModalPadrao
        open={isSuccessModalOpen}
        onOpenChange={(open) => { if (!open) { setIsSuccessModalOpen(false); handleReset() } }}
        titulo="Anúncios publicados"
        descricao={`${publishSuccess?.total_criados ?? 0} anúncios já estão visíveis no catálogo para as outras instituições.`}
        acoes={
          <>
            <button type="button" onClick={() => { setIsSuccessModalOpen(false); handleReset() }} className={BOTAO.secundario}>
              Importar outra planilha
            </button>
            <button type="button" onClick={() => router.push("/meus-anuncios")} className={BOTAO.primario}>
              Ver meus anúncios
            </button>
          </>
        }
      />

    </div>
  )
}
