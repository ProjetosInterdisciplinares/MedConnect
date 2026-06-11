"use client"

import { useEffect, useState } from "react"
import { Package, Tag, Layers, Hash } from "lucide-react"

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
  CreateMatMedForm,
  Marca,
  TipoMatMed,
} from "@/types"

import servicesGetCategorias from "@/server/(GET)-categorias"
import servicesGetMarcas from "@/server/(GET)-marcas"
import servicesCreateMatMed from "@/server/(POST)-mat-med"

export default function FormInsumo() {
  const [categories, setCategories] = useState<TipoMatMed[]>([])
  const [brands, setBrands] = useState<Marca[]>([])

  const [insumoForm, setInsumoForm] =
  useState<CreateMatMedForm>({
    ds_mat: "",
    ds_marca: 0,
    ds_tipo: "" as any,
    ds_pessoaj: 0,

    cd_tiss: "",
    cd_tuss: "",
    cd_simpro: "",
    cd_brasindice: "",
  })

  useEffect(() => {
    async function initialize() {
      const [responseCategory, responseBrand] =
        await Promise.all([
          servicesGetCategorias(),
          servicesGetMarcas(),
        ])

      if (
        responseCategory &&
        !("isError" in responseCategory)
      ) {
        setCategories(responseCategory)
      }

      if (
        responseBrand &&
        !("isError" in responseBrand)
      ) {
        setBrands(responseBrand)
      }
    }

    initialize()

    const userId =
      Number(localStorage.getItem("userId") || 0)

    setInsumoForm((prev) => ({
      ...prev,
      ds_pessoaj: userId,
    }))
  }, [])

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const response =
      await servicesCreateMatMed(insumoForm)

    if ("isError" in response) {
      console.error(response.message)
      return
    }

    setInsumoForm((prev) => ({
      ...prev,

      ds_mat: "",
      ds_marca: 0,
      ds_tipo: "" as any,
      ds_pessoaj: 0,

      cd_tiss: "",
      cd_tuss: "",
      cd_simpro: "",
      cd_brasindice: "",
    }))
  }

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit}
    >
      <h2 className="text-lg font-bold flex items-center gap-2 text-sky-800">
        <Package className="text-sky-800" />
        Cadastrar Insumo
      </h2>

      {/* Nome + Categoria */}
      <InputField
        label="Nome do Insumo"
        icon={Tag}
        placeholder="Ex: Seringa 5ml"
        value={insumoForm.ds_mat}
        onChange={(event) =>
          setInsumoForm((prev) => ({
            ...prev,
            ds_mat: event.target.value,
          }))
        }
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold">
          Categoria
        </label>

        <Select
          value={insumoForm.ds_tipo}
          onValueChange={(value) =>
            setInsumoForm((prev) => ({
              ...prev,
              ds_tipo: value as CreateMatMedForm["ds_tipo"],
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>

          <SelectContent>
            {categories.map((categoria) => (
              <SelectItem
                key={categoria.cd_tipo}
                value={String(categoria.cd_tipo)}
              >
                {categoria.ds_tipo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Marca */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">
            Marca
          </label>

          <Select
            value={
              insumoForm.ds_marca
                ? String(insumoForm.ds_marca)
                : undefined
            }
            onValueChange={(value) =>
              setInsumoForm((prev) => ({
                ...prev,
                ds_marca: Number(value),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>
                  Marcas
                </SelectLabel>

                {brands.map((marca) => (
                  <SelectItem
                    key={marca.cd_marca}
                    value={String(marca.cd_marca)}
                  >
                    {marca.ds_marca}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div />
      </div>

      {/* TISS + TUSS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Código TISS"
          icon={Hash}
          placeholder="Ex: 19"
          value={insumoForm.cd_tiss || ""}
          onChange={(event) =>
            setInsumoForm((prev) => ({
              ...prev,
              cd_tiss: event.target.value,
            }))
          }
        />

        <InputField
          label="Código TUSS"
          icon={Hash}
          placeholder="Ex: 70908788"
          value={insumoForm.cd_tuss || ""}
          onChange={(event) =>
            setInsumoForm((prev) => ({
              ...prev,
              cd_tuss: event.target.value,
            }))
          }
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

      <button className="w-full bg-sky-950 hover:bg-sky-900 text-white font-bold py-3 rounded-lg transition-colors">
        Salvar Insumo
      </button>
    </form>
  )
}