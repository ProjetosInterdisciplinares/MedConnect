"use client"

import { useEffect, useState } from "react"
import { Package, Tag, Hash, CheckCircle, Scale } from "lucide-react"

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

import { CreateMatMedForm } from "@/types"

import servicesCreateMatMed from "@/server/(POST)-mat-med"
import { AuthManager } from "@/lib/AuthManager"

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
  })

  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<CreateMatMedForm | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const userId = AuthManager.getInstance().getUserId() || 0

    setInsumoForm((prev) => ({
      ...prev,
      ds_pessoaj: userId,
    }))
  }, [])

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
    }))
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <h2 className="text-lg font-bold flex items-center gap-2 text-blue-800">
        <Package className="text-blue-800" />
        Cadastrar Insumo
      </h2>

      {fieldErrors.global && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {fieldErrors.global}
        </div>
      )}

      {/* Nome + Categoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="Nome do Insumo"
            icon={Tag}
            placeholder="Ex: Seringa 5ml"
            value={insumoForm.ds_mat || ""}
            required
            error={fieldErrors.ds_mat}
            onChange={(event) => {
              setFieldErrors((prev) => ({ ...prev, ds_mat: "" }))
              setInsumoForm((prev) => ({ ...prev, ds_mat: event.target.value }))
            }}
          />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold flex items-center gap-1">Categoria <span className="text-red-500 text-xs mt-0.5">*</span></label>
            <Select
              value={insumoForm.ds_tipo || ""}
              onValueChange={(value) => {
                setFieldErrors((prev) => ({ ...prev, ds_tipo: "" }))
                setInsumoForm((prev) => ({ ...prev, ds_tipo: value || undefined }))
              }}
            >
              <SelectTrigger className={`w-full bg-white border rounded-lg text-sm h-11 ${
                fieldErrors.ds_tipo ? "border-red-300 focus:ring-red-400" : "border-zinc-200"
              }`}>
                <SelectValue placeholder="Selecione uma categoria" />
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
      </div>

      {/* Marca + Unidade Medida */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Marca"
          icon={Tag}
          placeholder="Digite a marca do insumo"
          value={insumoForm.ds_marca || ""}
          required
          error={fieldErrors.ds_marca}
          onChange={(event) => {
            setFieldErrors((prev) => ({ ...prev, ds_marca: "" }))
            setInsumoForm((prev) => ({ ...prev, ds_marca: event.target.value }))
          }}
        />

        <InputField
          label="Unidade de Medida"
          icon={Scale}
          placeholder="Ex: Caixa, Unidade, Frasco"
          value={insumoForm.unidade_med || ""}
          required
          error={fieldErrors.unidade_med}
          onChange={(event) => {
            setFieldErrors((prev) => ({ ...prev, unidade_med: "" }))
            setInsumoForm((prev) => ({ ...prev, unidade_med: event.target.value }))
          }}
        />
      </div>

      {/* TISS + TUSS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Tabela TISS</label>
          <Select
            value={insumoForm.cd_tiss || ""}
            onValueChange={(value) =>
              setInsumoForm((prev) => ({
                ...prev,
                cd_tiss: value || undefined,
              }))
            }
          >
            <SelectTrigger className="w-full bg-white border border-zinc-200 rounded-lg text-sm h-11">
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
          placeholder="Ex: 70908788"
          value={insumoForm.cd_tuss || ""}
          required
          error={fieldErrors.cd_tuss}
          onChange={(event) => {
            setFieldErrors((prev) => ({ ...prev, cd_tuss: "" }))
            setInsumoForm((prev) => ({ ...prev, cd_tuss: event.target.value }))
          }}
        />
      </div>

      {/* SIMPRO + BRASÍNDICE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Código SIMPRO"
          icon={Hash}
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
          placeholder="Ex: 41723412ERRU"
          value={insumoForm.cd_brasindice || ""}
          onChange={(event) =>
            setInsumoForm((prev) => ({
              ...prev,
              cd_brasindice: event.target.value,
            }))
          }
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
        style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
      >
        {isSubmitting ? "Salvando..." : "Salvar Insumo"}
      </button>

      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700 text-xl">
              <CheckCircle className="w-6 h-6" />
              Insumo Cadastrado!
            </DialogTitle>
            <DialogDescription>
              O insumo foi registrado com sucesso e está pronto para ser anunciado.
            </DialogDescription>
          </DialogHeader>
          {lastSaved && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 mt-2 text-sm">
              <p><span className="font-semibold text-slate-600">Insumo:</span> {lastSaved.ds_mat || "(Não informado)"}</p>
              <p><span className="font-semibold text-slate-600">Categoria:</span> {lastSaved.ds_tipo || "(Não informado)"}</p>
              <p><span className="font-semibold text-slate-600">Marca:</span> {lastSaved.ds_marca || "(Não informado)"}</p>
              <p><span className="font-semibold text-slate-600">TUSS:</span> {lastSaved.cd_tuss}</p>
            </div>
          )}
          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => setIsSuccessOpen(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors w-full sm:w-auto cursor-pointer"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}