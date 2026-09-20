"use client"

import { Fabricante } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetFabricantes(): Promise<ServiceResult<Fabricante[]>> {
  const response = await fetch(buildUrl("/api/medconnect/fabricante/"), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<Fabricante[]>(response, "Nao foi possivel listar fabricantes")
}