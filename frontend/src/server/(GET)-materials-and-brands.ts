"use client"

import { MatMed } from "@/types"

export default async function servicesGetMaterials() {
  const token = localStorage.getItem("token")

  if (!token) {
    return {
      isError: true,
      status: 401,
      message: "Token não encontrado"
    }
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/medconnect/mat_med/`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    }
  )

  if (!response.ok) {
    return {
      isError: true,
      status: response.status,
      message: "Não foi possível obter os materiais"
    }
  }

  const data: MatMed[] = await response.json()
  return data
}