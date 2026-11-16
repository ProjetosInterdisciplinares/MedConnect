"use client"

import Link from "next/link"
import { ModalPadrao, Resumo, BOTAO } from "@/components/ui/modal-padrao"
import { useEffect, useMemo, useState } from "react"
import { Tag, Hash, CheckCircle, Scale } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

import InputField from "./InputField"

import { CreateMatMedForm, MatMed } from "@/types"

import servicesCreateMatMed from "@/server/(POST)-mat-med"
import servicesGetMaterials from "@/server/(GET)-materials-and-brands"
import servicesGetCatmatSugestoes from "@/server/(GET)-catmat-sugestoes"
import { AuthManager } from "@/lib/AuthManager"
import CampoSugestoes, { Sugestao } from "@/components/ui/campo-sugestoes"
import { UNIDADES_COMUNS } from "@/lib/format/unidade"
import InfoCodigo from "@/components/ui/info-codigo"

export default function FormInsumo() {
  const [insumoForm, setInsumoForm] = useState<CreateMatMedForm>({
    ds_mat: "",
    ds_marca: "",
    ds_tipo: "",
    ds_pessoaj: 0,
    unidade_med: "",
    cd_tiss: undefined,
    cd_tuss: "",
    cd_simpro: "",
    cd_brasindice: "",
    cd_catmat: "",
  })

  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<CreateMatMedForm | null>(null)
  const [novoId, setNovoId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [catalogo, setCatalogo] = useState<MatMed[]>([])
  const [preenchidoDoCatalogo, setPreenchidoDoCatalogo] = useState(false)
  const [sugestoesCatmat, setSugestoesCatmat] = useState<Sugestao[]>([])

  /* ─── CATMAT sugerido a partir do nome e da categoria digitados ─── */
  useEffect(() => {
    const nome = insumoForm.ds_mat?.trim() || ""
    if (nome.length < 3) {
      setSugestoesCatmat([])
      return
    }
    const espera = setTimeout(() => {
      servicesGetCatmatSugestoes(nome, insumoForm.ds_tipo).then((resposta) => {
        if (Array.isArray(resposta)) {
          setSugestoesCatmat(resposta.map((s) => ({ valor: s.codigo, detalhe: s.descricao })))
        }
      })
    }, 400)
    return () => clearTimeout(espera)
  }, [insumoForm.ds_mat, insumoForm.ds_tipo])

  useEffect(() => {
    const userId = AuthManager.getInstance().getUserId() || 0

    setInsumoForm((prev) => ({
      ...prev,
      ds_pessoaj: userId,
    }))

    servicesGetMaterials().then((resposta) => {
      if (Array.isArray(resposta)) setCatalogo(resposta)
    })
  }, [])

  /* ─── Sugestões a partir dos insumos já cadastrados na plataforma ─── */
  const sugestoesNome = useMemo<Sugestao<MatMed>[]>(() => {
    const vistos = new Set<string>()
    return catalogo
      .filter((m) => m.ds_mat)
      .filter((m) => {
        const chave = `${m.ds_mat}|${m.ds_marca}|${m.unidade_med}`.toLowerCase()
        if (vistos.has(chave)) return false
        vistos.add(chave)
        return true
      })
      .map((m) => ({
        valor: m.ds_mat as string,
        detalhe: [m.ds_marca, m.unidade_med, m.cd_tuss && `TUSS ${m.cd_tuss}`].filter(Boolean).join(" · "),
        dados: m,
      }))
  }, [catalogo])

  const sugestoesMarca = useMemo<Sugestao[]>(() => {
    const marcas = new Set(catalogo.map((m) => m.ds_marca?.trim()).filter(Boolean) as string[])
    return Array.from(marcas).sort((a, b) => a.localeCompare(b, "pt-BR")).map((valor) => ({ valor }))
  }, [catalogo])

  const sugestoesUnidade = useMemo<Sugestao[]>(() => {
    const unidades = new Set<string>(UNIDADES_COMUNS)
    catalogo.forEach((m) => m.unidade_med?.trim() && unidades.add(m.unidade_med.trim()))
    return Array.from(unidades).map((valor) => ({ valor }))
  }, [catalogo])

  function preencherComInsumoExistente(m: MatMed) {
    setInsumoForm((prev) => ({
      ...prev,
      ds_mat: m.ds_mat || prev.ds_mat,
      ds_tipo: m.ds_tipo || prev.ds_tipo,
      ds_marca: m.ds_marca || prev.ds_marca,
      unidade_med: m.unidade_med || prev.unidade_med,
      cd_tuss: m.cd_tuss || prev.cd_tuss,
      cd_tiss: m.cd_tiss || prev.cd_tiss,
      cd_simpro: m.cd_simpro || prev.cd_simpro,
      cd_brasindice: m.cd_brasindice || prev.cd_brasindice,
      cd_catmat: m.cd_catmat || prev.cd_catmat,
    }))
    setFieldErrors({})
    setPreenchidoDoCatalogo(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    const errors: Record<string, string> = {}
    if (!insumoForm.ds_mat) errors.ds_mat = "Nome é obrigatório."
    if (!insumoForm.ds_tipo) errors.ds_tipo = "Categoria é obrigatória."
    if (!insumoForm.ds_marca) errors.ds_marca = "Marca é obrigatória."
    if (!insumoForm.unidade_med) errors.unidade_med = "Unidade é obrigatória."
    if (!insumoForm.cd_tuss) errors.cd_tuss = "Código TUSS é obrigatório."

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setIsSubmitting(false)
      return
    }

    const response = await servicesCreateMatMed(insumoForm)

    if ("isError" in response) {
      console.error(response.message)
      setFieldErrors({ global: response.message || "Erro ao cadastrar insumo." })
      setIsSubmitting(false)
      return
    }

    setLastSaved(insumoForm)
    setNovoId(response.cd_mat ?? null)
    setIsSuccessOpen(true)
    setIsSubmitting(false)

    setInsumoForm((prev) => ({
      ...prev,
      ds_mat: "",
      ds_marca: "",
      ds_tipo: "",
      unidade_med: "",
      cd_tiss: undefined,
      cd_tuss: "",
      cd_simpro: "",
      cd_brasindice: "",
      cd_catmat: "",
    }))
  }

  return (
    <form onSubmit={handleSubmit}>

      {fieldErrors.global && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {fieldErrors.global}
        </div>
      )}

      <fieldset>
        <legend className="text-base font-semibold text-slate-900">Identificação</legend>
        <p className="mt-0.5 text-xs text-slate-500">Como o insumo aparece nos anúncios e no catálogo.</p>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-x-6 gap-y-5">
        <div className="md:col-span-2">
          <CampoSugestoes
            label="Nome do Insumo"
            icon={Tag}
            placeholder="Ex: Seringa 5ml"
            value={insumoForm.ds_mat || ""}
            required
            error={fieldErrors.ds_mat}
            sugestoes={sugestoesNome}
            onSelecionar={(s) => s.dados && preencherComInsumoExistente(s.dados)}
            onChange={(texto) => {
              setFieldErrors((prev) => ({ ...prev, ds_mat: "" }))
              setPreenchidoDoCatalogo(false)
              setInsumoForm((prev) => ({ ...prev, ds_mat: texto }))
            }}
          />
          {preenchidoDoCatalogo && (
            <p className="mt-1 text-xs text-blue-700">Campos preenchidos a partir de um insumo já cadastrado. Confira antes de salvar.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold flex items-center gap-1">Categoria <span className="text-red-500 text-xs mt-0.5">*</span></label>
            <Select
              value={insumoForm.ds_tipo || ""}
              onValueChange={(value) => {
                setFieldErrors((prev) => ({ ...prev, ds_tipo: "" }))
                setInsumoForm((prev) => ({ ...prev, ds_tipo: value || undefined }))
              }}
            >
              <SelectTrigger className={`w-full bg-surface border rounded-lg text-sm h-11 ${
                fieldErrors.ds_tipo ? "border-danger focus:ring-danger/20" : "border-border"
              }`}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="Material Hospitalar">Material Hospitalar</SelectItem>
                <SelectItem value="Medicamento">Medicamento</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {fieldErrors.ds_tipo && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <CheckCircle className="w-3 h-3 shrink-0 hidden" />
              {fieldErrors.ds_tipo}
            </p>
          )}
        </div>

        <CampoSugestoes
          label="Marca"
          icon={Tag}
          placeholder="Ex: Descarpack"
          value={insumoForm.ds_marca || ""}
          required
          error={fieldErrors.ds_marca}
          sugestoes={sugestoesMarca}
          onChange={(texto) => {
            setFieldErrors((prev) => ({ ...prev, ds_marca: "" }))
            setInsumoForm((prev) => ({ ...prev, ds_marca: texto }))
          }}
        />

        <CampoSugestoes
          label="Unidade de Medida"
          icon={Scale}
          placeholder="Ex: Caixa c/ 100"
          value={insumoForm.unidade_med || ""}
          required
          error={fieldErrors.unidade_med}
          sugestoes={sugestoesUnidade}
          mostrarComCampoVazio
          onChange={(texto) => {
            setFieldErrors((prev) => ({ ...prev, unidade_med: "" }))
            setInsumoForm((prev) => ({ ...prev, unidade_med: texto }))
          }}
        />
      </div>
      </fieldset>

      <fieldset className="mt-8 pt-6 border-t border-slate-100">
        <legend className="sr-only">Códigos de faturamento</legend>
        <p className="text-base font-semibold text-slate-900" aria-hidden="true">Códigos de faturamento</p>
        <p className="mt-0.5 text-xs text-slate-500">Identificação nas tabelas usadas pelos hospitais. Só o TUSS é obrigatório.</p>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-5">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5">
            <label className="text-sm font-semibold">Tabela TISS</label>
            <InfoCodigo codigo="TISS" />
          </span>
          <Select
            value={insumoForm.cd_tiss || ""}
            onValueChange={(value) =>
              setInsumoForm((prev) => ({
                ...prev,
                cd_tiss: value || undefined,
              }))
            }
          >
            <SelectTrigger className="w-full bg-surface border border-border rounded-lg text-sm h-11">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="19">19 - Brasíndice</SelectItem>
                <SelectItem value="20">20 - TUSS</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <InputField
          label="Código TUSS"
          icon={Hash}
          ajuda={<InfoCodigo codigo="TUSS" />}
          placeholder="Ex: 70908788"
          value={insumoForm.cd_tuss || ""}
          required
          error={fieldErrors.cd_tuss}
          onChange={(event) => {
            setFieldErrors((prev) => ({ ...prev, cd_tuss: "" }))
            setInsumoForm((prev) => ({ ...prev, cd_tuss: event.target.value.substring(0, 8) }))
          }}
        />

        <InputField
          label="Código SIMPRO"
          icon={Hash}
          ajuda={<InfoCodigo codigo="SIMPRO" />}
          placeholder="Ex: 1197898"
          value={insumoForm.cd_simpro || ""}
          onChange={(event) =>
            setInsumoForm((prev) => ({
              ...prev,
              cd_simpro: event.target.value,
            }))
          }
        />

        <InputField
          label="Código Brasíndice"
          icon={Hash}
          ajuda={<InfoCodigo codigo="BRASINDICE" />}
          placeholder="Ex: 41723412ERRU"
          value={insumoForm.cd_brasindice || ""}
          onChange={(event) =>
            setInsumoForm((prev) => ({
              ...prev,
              cd_brasindice: event.target.value,
            }))
          }
        />

        <div className="md:col-span-2 xl:col-span-4">
          <CampoSugestoes
            label="Código CATMAT"
            icon={Hash}
            ajuda={<InfoCodigo codigo="CATMAT" />}
            placeholder={sugestoesCatmat.length ? "Escolha uma sugestão ou digite o código" : "Ex: 439630"}
            value={insumoForm.cd_catmat || ""}
            maxLength={9}
            sugestoes={sugestoesCatmat}
            mostrarComCampoVazio
            onChange={(texto) => setInsumoForm((prev) => ({ ...prev, cd_catmat: texto.replace(/\D/g, "") }))}
          />
          <p className="mt-1 text-xs text-slate-500">
            Sugerido pelo nome do insumo, a partir do catálogo do Governo Federal. Permite consultar o preço de referência em compras públicas.
          </p>
        </div>
      </div>
      </fieldset>

      <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-slate-500"><span className="text-red-500">*</span> Campos obrigatórios</p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-10 px-5 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? "Salvando…" : "Salvar insumo"}
        </button>
      </div>

      <ModalPadrao
        open={isSuccessOpen}
        onOpenChange={setIsSuccessOpen}
        titulo="Insumo cadastrado"
        descricao="O insumo já pode ser usado para publicar anúncios."
        acoes={
          <>
            <button type="button" onClick={() => setIsSuccessOpen(false)} className={BOTAO.secundario}>Cadastrar outro</button>
            <Link href={novoId ? `/anunciar?mat=${novoId}` : "/anunciar"} className={BOTAO.primario}>Publicar anúncio</Link>
          </>
        }
      >
        {lastSaved && (
          <Resumo itens={[
            ["Insumo", lastSaved.ds_mat || "Não informado"],
            ["Categoria", lastSaved.ds_tipo || "Não informada"],
            ["Marca", lastSaved.ds_marca || "Não informada"],
            ["TUSS", lastSaved.cd_tuss],
          ]} />
        )}
      </ModalPadrao>
    </form>
  )
}