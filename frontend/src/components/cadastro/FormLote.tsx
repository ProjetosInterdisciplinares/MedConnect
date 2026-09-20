"use client"

import React, { useEffect, useState } from "react"
import {
  AlertCircle,
  Calendar,
  Hash,
  Layers,
  CheckCircle,
} from "lucide-react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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

import {
  CreateLoteForm,
  Fabricante,
  MatMed,
} from "@/types"

import servicesGetFabricantes from "@/server/(GET)-fabricantes"
import servicesGetMatMed from "@/server/(GET)-mat-med"
import servicesCreateLote from "@/server/(POST)-lote"

export default function FormLote() {
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([])
  const [materiais, setMateriais] = useState<MatMed[]>([])

  const [loteForm, setLoteForm] = useState<CreateLoteForm>({
    ds_lote: "",
    dt_fabricacao: "",
    dt_validade: "",
    qtd_lote: 0,
    unidade_med: "UN",
    fabricante: 0,
    cd_material: 0,
    cd_pessoaj: 0,
  })

  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<CreateLoteForm | null>(null)

  useEffect(() => {
    async function initialize() {
      const [responseFabricantes, responseMateriais] =
        await Promise.all([
          servicesGetFabricantes(),
          servicesGetMatMed(),
        ])

      if (
        responseFabricantes &&
        !("isError" in responseFabricantes)
      ) {
        setFabricantes(responseFabricantes)
      }

      if (
        responseMateriais &&
        !("isError" in responseMateriais)
      ) {
        setMateriais(responseMateriais)
      }
    }

    initialize()

    const userId =
      Number(localStorage.getItem("userId") || 0)

    setLoteForm((prev) => ({
      ...prev,
      cd_pessoaj: userId,
    }))
  }, [])


  async function handleSubmitLote(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const response = await servicesCreateLote(loteForm)

    if ("isError" in response) {
      console.error(response.message)
      return
    }

    setLastSaved(loteForm)
    setIsSuccessOpen(true)

    setLoteForm((prev) => ({
      ...prev,
      ds_lote: "",
      dt_fabricacao: "",
      dt_validade: "",
      qtd_lote: 0,
    }))
  }

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmitLote}
    >
      <h2 className="text-lg font-bold flex items-center gap-2 text-teal-800">
        <Layers className="text-teal-800" />
        Cadastrar Lote
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Insumo Vinculado
          </label>

          <Select
            value={
              loteForm.cd_material
                ? String(loteForm.cd_material)
                : ""
            }
            onValueChange={(value) =>
              setLoteForm((prev) => ({
                ...prev,
                cd_material: Number(value),
              }))
            }
            disabled={materiais.length === 0}
          >
            <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm">
              <SelectValue placeholder="Selecione o insumo">
                {loteForm.cd_material
                  ? materiais.find(m => String(m.cd_mat) === String(loteForm.cd_material))?.ds_mat
                  : undefined}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>Insumos</SelectLabel>

                {materiais.map((material) => (
                  <SelectItem
                    key={material.cd_mat}
                    value={String(material.cd_mat)}
                  >
                    {material.ds_mat}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <InputField
          label="Lote"
          icon={Hash}
          placeholder="Ex: ABC123456"
          value={loteForm.ds_lote}
          onChange={(event) =>
            setLoteForm((prev) => ({
              ...prev,
              ds_lote: event.target.value,
            }))
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Data de Fabricação"
          icon={Calendar}
          type="datetime-local"
          value={loteForm.dt_fabricacao}
          onChange={(event) =>
            setLoteForm((prev) => ({
              ...prev,
              dt_fabricacao: event.target.value,
            }))
          }
        />

        <InputField
          label="Data de Validade"
          icon={Calendar}
          type="date"
          value={loteForm.dt_validade}
          onChange={(event) =>
            setLoteForm((prev) => ({
              ...prev,
              dt_validade: event.target.value,
            }))
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Fabricante
          </label>

          <Select
            value={
              loteForm.fabricante
                ? String(loteForm.fabricante)
                : ""
            }
            onValueChange={(value) =>
              setLoteForm((prev) => ({
                ...prev,
                fabricante: Number(value),
              }))
            }
            disabled={fabricantes.length === 0}
          >
            <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm">
              <SelectValue placeholder="Selecione o fabricante">
                {loteForm.fabricante
                  ? fabricantes.find(f => String(f.cd_fabricante) === String(loteForm.fabricante))?.ds_fabricante
                  : undefined}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>Fabricantes</SelectLabel>

                {fabricantes.map((item) => (
                  <SelectItem
                    key={item.cd_fabricante}
                    value={String(item.cd_fabricante)}
                  >
                    {item.ds_fabricante}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <InputField
          label="Quantidade Inicial"
          icon={Hash}
          type="number"
          value={loteForm.qtd_lote || ""}
          onChange={(event) =>
            setLoteForm((prev) => ({
              ...prev,
              qtd_lote: Number(event.target.value),
            }))
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Unidade de Medida"
          icon={AlertCircle}
          value={loteForm.unidade_med}
          onChange={(event) =>
            setLoteForm((prev) => ({
              ...prev,
              unidade_med: event.target.value,
            }))
          }
        />

      </div>

      <button 
        type="submit"
        className="w-full text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer"
        style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
      >
        Registrar Lote
      </button>

      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700 text-xl">
              <CheckCircle className="w-6 h-6" />
              Lote Registrado!
            </DialogTitle>
            <DialogDescription>
              O novo lote foi cadastrado com sucesso para o insumo selecionado.
            </DialogDescription>
          </DialogHeader>
          {lastSaved && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 mt-2 text-sm">
              <p><span className="font-semibold text-slate-600">Insumo:</span> {materiais.find(m => String(m.cd_mat) === String(lastSaved.cd_material))?.ds_mat}</p>
              <p><span className="font-semibold text-slate-600">Lote:</span> {lastSaved.ds_lote}</p>
              <p><span className="font-semibold text-slate-600">Validade:</span> {lastSaved.dt_validade ? new Date(lastSaved.dt_validade).toLocaleDateString("pt-BR") : ""}</p>
              <p><span className="font-semibold text-slate-600">Quantidade Inicial:</span> {lastSaved.qtd_lote} {lastSaved.unidade_med}</p>
            </div>
          )}
          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => setIsSuccessOpen(false)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition-colors w-full sm:w-auto cursor-pointer"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}