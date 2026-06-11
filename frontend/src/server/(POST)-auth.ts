"use client"

import { AuthLoginRequest, AuthLoginResponse } from "@/types"

export default async function servicesAuth({
  cnpj,
  password
}: AuthLoginRequest): Promise<
  AuthLoginResponse |
  { isError: true; status: number; message: string }
> {
  const baseURL = process.env.NEXT_PUBLIC_API_URL

  if (!baseURL) {
    throw new Error("NEXT_PUBLIC_API_URL não está definida")
  }

  const cleanCNPJ = cnpj.replace(/\D/g, "")

  const response = await fetch(
    `${baseURL}/authentication/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cnpj: cleanCNPJ,
        password
      })
    }
  )

  const data = await response.json()

  if (!response.ok) {
    return {
      isError: true,
      status: response.status,
      message: data?.error || "Não foi possível autenticar"
    }
  }

  return data as AuthLoginResponse
}