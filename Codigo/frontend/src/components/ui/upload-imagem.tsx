"use client"

import React, { useRef, useState } from "react"
import { ImagePlus, RefreshCw, Trash2, UploadCloud } from "lucide-react"

type Props = {
  /** Imagem atual em base64 (ou string vazia). */
  imagem: string
  /** Arquivo escolhido por clique ou arrastado para a área. */
  onArquivo: (arquivo: File) => void
  onRemover: () => void
  tiposAceitos?: string
  tamanhoMaximoMB?: number
  rotulo?: string
}

/** Área de envio de foto com arrastar e soltar, prévia e ações. */
export default function UploadImagem({
  imagem, onArquivo, onRemover,
  tiposAceitos = "image/png, image/jpeg, image/webp", tamanhoMaximoMB = 5, rotulo = "Foto do Lote/Insumo",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastando, setArrastando] = useState(false)

  function abrirSeletor() {
    inputRef.current?.click()
  }

  function aoSoltar(e: React.DragEvent) {
    e.preventDefault()
    setArrastando(false)
    const arquivo = e.dataTransfer.files?.[0]
    if (arquivo) onArquivo(arquivo)
  }

  const eventosArrastar = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setArrastando(true)
    },
    onDragLeave: () => setArrastando(false),
    onDrop: aoSoltar,
  }

  const inputArquivo = (
    <input
      ref={inputRef}
      type="file"
      className="sr-only"
      tabIndex={-1}
      accept={tiposAceitos}
      onChange={(e) => {
        const arquivo = e.target.files?.[0]
        if (arquivo) onArquivo(arquivo)
        e.target.value = "" // permite escolher o mesmo arquivo de novo
      }}
    />
  )

  return (
    <div className="w-full flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{rotulo}</span>

      {!imagem ? (
        <button
          type="button"
          onClick={abrirSeletor}
          {...eventosArrastar}
          className={`flex flex-col items-center justify-center gap-2 w-full h-40 rounded-xl border-2 border-dashed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-600
            ${arrastando ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400"}`}
        >
          <span className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
            {arrastando
              ? <UploadCloud size={20} className="text-blue-700" aria-hidden="true" />
              : <ImagePlus size={20} className="text-blue-900" aria-hidden="true" />}
          </span>
          <span className="text-sm font-semibold text-slate-700">
            {arrastando ? "Solte a imagem para enviar" : "Arraste a foto aqui ou clique para escolher"}
          </span>
          <span className="text-xs text-slate-500">PNG, JPG ou WEBP, até {tamanhoMaximoMB} MB</span>
          {inputArquivo}
        </button>
      ) : (
        <div
          {...eventosArrastar}
          className={`flex flex-col sm:flex-row gap-4 rounded-xl border p-3 transition-colors
            ${arrastando ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}
        >
          <div className="w-full sm:w-44 h-36 shrink-0 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagem} alt="Prévia da foto do anúncio" className="max-w-full max-h-full object-contain" />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Foto adicionada</p>
              <p className="text-xs text-slate-500">
                {arrastando ? "Solte para substituir a foto atual." : "Ela aparece no catálogo junto com o anúncio. Você também pode arrastar outra foto para cá."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={abrirSeletor}
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={14} aria-hidden="true" /> Trocar foto
              </button>
              <button
                type="button"
                onClick={onRemover}
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} aria-hidden="true" /> Remover
              </button>
            </div>
          </div>
          {inputArquivo}
        </div>
      )}
    </div>
  )
}
