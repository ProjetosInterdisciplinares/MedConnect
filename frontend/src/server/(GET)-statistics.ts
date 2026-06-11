"use client"

import { StatisticsResponse } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetStatistics(): Promise<ServiceResult<StatisticsResponse>> {
  const response = await fetch(buildUrl("/statistics/"), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<StatisticsResponse>(response, "Nao foi possivel obter as estatisticas")
}