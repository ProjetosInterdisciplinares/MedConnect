"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Search, Tag, Building2, ChevronLeft, Stethoscope, PackageX } from "lucide-react"

import { MatMed } from "@/types"

import servicesGetMaterialDetails from "@/server/(GET)-material-details"

export default function MaterialDetails() {
  const params = useParams()
  const router = useRouter()

  const materialId = params.materialId as string

  const [material, setMaterial] = useState<MatMed | null>(null)

  useEffect(() => {
    if (!materialId) return

    servicesGetMaterialDetails(materialId).then((response) => {

      // verifica se veio erro
      if ("isError" in response) {
        console.log("Erro:", response.status)
        return
      }

      // aqui o TS já entende que é MatMed
      setMaterial(response)
    })
  }, [materialId])

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">
        {material?.ds_mat ?? "Carregando..."}
      </h1>

      <div className="bg-gray-100 p-4 rounded-md space-y-2">

        <h2 className="text-lg mb-6">
          Informações Gerais
        </h2>

        <p>
          <strong>Código do Insumo:</strong>{" "}
          {material?.cd_mat ?? "Carregando..."}
        </p>

        <p>
          <strong>Marca:</strong>{" "}
          {material?.ds_marca ?? "Carregando..."}
        </p>

        <p>
          <strong>Categoria:</strong>{" "}
          {material?.ds_tipo ?? "Carregando..."}
        </p>

        <p>
          <strong>Fabricante:</strong>{" "}
          {material?.ds_pessoaj ?? "Carregando..."}
        </p>

      </div>

      <button
        onClick={() => router.back()}
        className="w-25 bg-cyan-700 hover:bg-cyan-900 text-white font-semibold rounded-xl h-12 transition-all duration-300 flex items-center justify-center gap-2 group/btn shadow-sm active:scale-[0.98]"
      >
        Voltar
        <ChevronLeft className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
      </button>
      
    </div>
  )
}