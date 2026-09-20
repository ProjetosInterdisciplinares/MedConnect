"use client"

import { useEffect, useState } from "react"
import { Package, Tag, Layers, Hash, CheckCircle } from "lucide-react"

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

    cd_tiss: undefined,
    cd_tuss: "",
    cd_simpro: "",
    cd_brasindice: "",
  })

  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<CreateMatMedForm | null>(null)

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

    setLastSaved(insumoForm)
    setIsSuccessOpen(true)

    setInsumoForm((prev) => ({
      ...prev,

      ds_mat: "",
      ds_marca: 0,
      ds_tipo: "" as any,
      ds_pessoaj: 0,

      cd_tiss: undefined,
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
      <h2 className="text-lg font-bold flex items-center gap-2 text-teal-800">
        <Package className="text-teal-800" />
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
            <SelectValue placeholder="Selecione uma categoria">
              {insumoForm.ds_tipo 
                ? categories.find(c => String(c.cd_tipo) === String(insumoForm.ds_tipo))?.ds_tipo 
                : undefined}
            </SelectValue>
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
                : ""
            }
            onValueChange={(value) =>
              setInsumoForm((prev) => ({
                ...prev,
                ds_marca: Number(value),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione">
                {insumoForm.ds_marca 
                  ? brands.find(b => String(b.cd_marca) === String(insumoForm.ds_marca))?.ds_marca 
                  : undefined}
              </SelectValue>
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
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Tabela TISS</label>
          <Select
            value={insumoForm.cd_tiss}
            onValueChange={(value) =>
              setInsumoForm((prev) => ({
                ...prev,
                cd_tiss: value || undefined,
              }))
            }
          >
            <SelectTrigger className="w-full bg-white border border-zinc-200 rounded-lg text-sm h-11">
              <SelectValue placeholder="Selecione">
                {insumoForm.cd_tiss === "19" ? "19 - Brasíndice" : insumoForm.cd_tiss === "20" ? "20 - TUSS" : undefined}
              </SelectValue>
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

      <button 
        type="submit"
        className="w-full text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer"
        style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
      >
        Salvar Insumo
      </button>

      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700 text-xl">
              <CheckCircle className="w-6 h-6" />
              Insumo Cadastrado!
            </DialogTitle>
            <DialogDescription>
              O insumo foi registrado com sucesso e está pronto para receber lotes.
            </DialogDescription>
          </DialogHeader>
          {lastSaved && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 mt-2 text-sm">
              <p><span className="font-semibold text-slate-600">Insumo:</span> {lastSaved.ds_mat}</p>
              <p><span className="font-semibold text-slate-600">Categoria:</span> {categories.find(c => String(c.cd_tipo) === String(lastSaved.ds_tipo))?.ds_tipo}</p>
              <p><span className="font-semibold text-slate-600">Marca:</span> {brands.find(b => String(b.cd_marca) === String(lastSaved.ds_marca))?.ds_marca}</p>
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