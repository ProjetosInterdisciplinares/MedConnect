"use client"

import { useState, type FormEvent } from "react"
import { Factory, Building2, CheckCircle } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

import InputField from "./InputField"

import { CreateFabricanteForm } from "@/types"

import servicesCreateFabricante from "@/server/(POST)-fabricante"

export default function FormFabricante() {
  const [fabricanteForm, setFabricanteForm] = useState<CreateFabricanteForm>({
    ds_fabricante: "",
    cnpj_fabri: "",
  })
  
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<CreateFabricanteForm | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const response = await servicesCreateFabricante(fabricanteForm)

    if ("isError" in response) {
      console.error(response.message)
      return
    }

    setLastSaved(fabricanteForm)
    setIsSuccessOpen(true)

    setFabricanteForm({
      ds_fabricante: "",
      cnpj_fabri: "",
    })
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <h2 className="text-lg font-bold flex items-center gap-2 text-blue-800">
        <Factory className="text-blue-800" />
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
        className="w-full text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer"
        style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
      >
        Salvar Fabricante
      </button>

      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700 text-xl">
              <CheckCircle className="w-6 h-6" />
              Cadastro Concluído!
            </DialogTitle>
            <DialogDescription>
              O fabricante foi registrado com sucesso e já está disponível no sistema.
            </DialogDescription>
          </DialogHeader>
          {lastSaved && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 mt-2 text-sm">
              <p><span className="font-semibold text-slate-600">Fabricante:</span> {lastSaved.ds_fabricante}</p>
              <p><span className="font-semibold text-slate-600">CNPJ:</span> {lastSaved.cnpj_fabri}</p>
            </div>
          )}
          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => setIsSuccessOpen(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
