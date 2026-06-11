"use client"

import { useState, type FormEvent } from "react"
import { Factory, Building2 } from "lucide-react"

import InputField from "./InputField"

import { CreateFabricanteForm } from "@/types"

import servicesCreateFabricante from "@/server/(POST)-fabricante"

export default function FormFabricante() {
  const [fabricanteForm, setFabricanteForm] = useState<CreateFabricanteForm>({
    ds_fabricante: "",
    cnpj_fabri: "",
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const response = await servicesCreateFabricante(fabricanteForm)

    if ("isError" in response) {
      console.error(response.message)
      return
    }

    setFabricanteForm({
      ds_fabricante: "",
      cnpj_fabri: "",
    })
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <h2 className="text-lg font-bold flex items-center gap-2 text-sky-800">
        <Factory className="text-sky-800" />
        Cadastrar Fabricante
      </h2>

      <InputField
        label="Nome do Fabricante"
        icon={Factory}
        placeholder="Ex: Medtronic"
        value={fabricanteForm.ds_fabricante}
        onChange={(event) =>
          setFabricanteForm((prev) => ({
            ...prev,
            ds_fabricante: event.target.value,
          }))
        }
      />

      <InputField
        label="CNPJ"
        icon={Building2}
        placeholder="00.000.000/0001-00"
        value={fabricanteForm.cnpj_fabri}
        onChange={(event) =>
          setFabricanteForm((prev) => ({
            ...prev,
            cnpj_fabri: event.target.value,
          }))
        }
      />

      <button
        type="submit"
        className="w-full bg-sky-950 hover:bg-sky-900 text-white font-bold py-3 rounded-lg transition-colors"
      >
        Salvar Fabricante
      </button>
    </form>
  )
}
