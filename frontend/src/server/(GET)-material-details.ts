"use client"

import { MatMed } from "@/types"

export default async function servicesGetMaterialDetails(
  materialId: string
): Promise<MatMed | { isError: true; status: number }> {
  const token = localStorage.getItem("token")

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/medconnect/mat_med/${materialId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    return {
      isError: true,
      status: response.status,
    }
  }

  return await response.json() as MatMed
}