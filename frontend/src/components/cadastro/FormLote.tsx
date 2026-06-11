"use client"

import React, { useEffect, useState } from "react"
import {
  AlertCircle,
  Calendar,
  Hash,
  Layers,
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
      <h2 className="text-lg font-bold flex items-center gap-2 text-sky-800">
        <Layers className="text-sky-800" />
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
                : undefined
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
              <SelectValue placeholder="Selecione o insumo" />
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
                : undefined
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
              <SelectValue placeholder="Selecione o fabricante" />
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

      <button className="w-full bg-sky-950 hover:bg-sky-900 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer">
        Registrar Lote
      </button>
    </form>
  )
}