"use client"

import { TipoMatMed } from "@/types"

declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string
  }
}

export default async function servicesGetCategorias() {
  const token = localStorage.getItem("token")

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/medconnect/tipo_matmed/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : ""
    },
  })

  if (!response.ok) {
    const error = {
      isError: true,
      status: response.status,
      message: "Não foi possível ver mais informações sobre tipos de material!"
    }
    return error
  }

  const data: TipoMatMed[] = await response.json()
  return data
}