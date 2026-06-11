"use client"

import React, { useEffect, useState } from "react"
import { Megaphone, Package, Layers, Hash, DollarSign, FileText, Sparkles } from "lucide-react"
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
  
export default function PublicarAnuncioPage() {
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
  })

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
      cd_pessoa_anunciante: anuncioForm.cd_pessoa_anunciante,
    }

    const response = await (servicesCreateAnuncio as any)(dataToSend)

    if (response && "isError" in response) {
      console.error("Erro ao criar anúncio:", response.message)
      alert("Falha ao publicar o anúncio. Tente novamente.")
      return
    }

    alert("Anúncio publicado com sucesso!")

    setAnuncioForm((prev) => ({
      ...prev,
      cd_mat: 0,
      nr_lote: 0,
      qtd_mat: 0,
      val_base: "",
      ds_obs: "",
    }))
    setLotes([])
  }

  const lotesFiltrados = lotes.filter(
  (lote) =>
    lote.cd_material === anuncioForm.cd_mat
  )

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-sky-800  flex items-center gap-2">
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
                    <SelectValue placeholder="Selecione o insumo cadastrado" />
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
                    <SelectValue placeholder={anuncioForm.cd_mat ? "Selecione um lote" : "Selecione um insumo primeiro"} />
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
                  className="text-xs flex items-center gap-1.5 bg-sky-700 text-zinc-50 font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-60 cursor-pointer"
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

          <button
            type="submit"
            className="w-full bg-sky-950 hover:bg-sky-900 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer mt-4"
          >
            Publicar no Marketplace
          </button>
        </form>
      </div>
    </div>
  )
}
