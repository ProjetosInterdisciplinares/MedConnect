"use client"

import {
  AuthRegisterRequest,
  AuthRegisterResponse
} from "@/types"

export default async function servicesRegister(
  data: AuthRegisterRequest
): Promise<
  AuthRegisterResponse |
  { isError: true; status: number; message: string }
> {

  const baseURL = process.env.NEXT_PUBLIC_API_URL

  if (!baseURL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL não está definida"
    )
  }

  const response = await fetch(
    `${baseURL}/authentication/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }
  )

  const result = await response.json()

  if (!response.ok) {
    return {
      isError: true,
      status: response.status,
      message:
        result?.error ||
        "Não foi possível solicitar o cadastro"
    }
  }

  return result as AuthRegisterResponse
}