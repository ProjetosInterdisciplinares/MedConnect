"use client"

import { CreateFabricanteForm, Fabricante } from "@/types"
import {
  buildUrl,
  getAuthHeaders,
  handleResponse,
  ServiceResult,
} from "@/server/middleware"

export default async function servicesCreateFabricante(
  payload: CreateFabricanteForm
): Promise<ServiceResult<Fabricante>> {
  const response = await fetch(
    buildUrl("/api/medconnect/fabricante/"),
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  )

  return handleResponse<Fabricante>(
    response,
    "Nao foi possivel cadastrar fabricante"
  )
}