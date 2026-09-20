"use client"

import { CreateMatMedForm, MatMed } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesCreateMatMed(payload: CreateMatMedForm): Promise<ServiceResult<MatMed>> {
  const response = await fetch(buildUrl("/api/medconnect/mat_med/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<MatMed>(response, "Nao foi possivel cadastrar insumo")
}
