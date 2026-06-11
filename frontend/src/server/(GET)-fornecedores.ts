"use client"

import { Fabricante } from "../types"

declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string
  }
}

export default async function servicesGetFornecedores() {
  const token = localStorage.getItem("token")

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/medconnect/fabricante/`, {
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
      message: "Não foi possível ver mais informações sobre este fabricante!"
    }
    return error
  }

  const data: Fabricante[] = await response.json()
  return data
}