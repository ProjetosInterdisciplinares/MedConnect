"use client"

import React, { useEffect, useState } from "react"
import { Building2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import AnimatedBackground from "@/components/ui/animated-background"

interface Empresa {
  cd_pessoaj: number
  nm_pessoaj: string
  razao_social: string
  nr_cnpj: string
  email_pj: string
  resp_tec: string
  status: string
}

export default function AdminCredenciamentos() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const fetchEmpresas = async () => {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res = await fetch(`${apiUrl}/api/medconnect/admin/pessoas/`)
      if (!res.ok) throw new Error("Erro ao carregar")
      const data = await res.json()
      setEmpresas(data)
    } catch (error) {
      toast.error("Erro ao carregar a lista de empresas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmpresas()
  }, [])

  const updateStatus = async (id: number, novoStatus: string) => {
    try {
      setActionLoading(id)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res = await fetch(`${apiUrl}/api/medconnect/admin/pessoas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: novoStatus }),
      })

      if (!res.ok) throw new Error("Erro ao atualizar")
      
      toast.success(`Empresa ${novoStatus === "ATIVA" ? "aprovada" : "rejeitada"} com sucesso!`)
      fetchEmpresas() // recarrega a lista
    } catch (error) {
      toast.error("Erro ao atualizar o status")
    } finally {
      setActionLoading(null)
    }
  }

  const pendentes = empresas.filter(e => e.status === "PENDENTE")
  const resolvidas = empresas.filter(e => e.status !== "PENDENTE")

  return (
    <div className="relative min-h-screen w-full font-sans text-gray-900 bg-gray-50/50 p-6 md:p-12 overflow-x-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-6xl mx-auto space-y-8 mt-12 md:mt-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-teal-900 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-teal-600" />
              Painel Administrativo
            </h1>
            <p className="text-gray-500 mt-2">Gerencie as solicitações de credenciamento das empresas.</p>
          </div>
          <button 
            onClick={fetchEmpresas}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium w-fit"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
            <Spinner className="w-8 h-8 text-teal-600 mb-4" />
            <p className="text-gray-500">Carregando solicitações...</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Secao de Pendentes */}
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-amber-50/50">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-gray-800">Aguardando Aprovação ({pendentes.length})</h2>
              </div>
              
              {pendentes.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  Nenhuma solicitação pendente no momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                      <tr>
                        <th className="px-6 py-4">Empresa</th>
                        <th className="px-6 py-4">CNPJ</th>
                        <th className="px-6 py-4">Contato</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pendentes.map((emp) => (
                        <tr key={emp.cd_pessoaj} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{emp.nm_pessoaj}</div>
                            <div className="text-xs text-gray-500">{emp.razao_social}</div>
                          </td>
                          <td className="px-6 py-4">{emp.nr_cnpj}</td>
                          <td className="px-6 py-4">
                            <div>{emp.email_pj}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Resp: {emp.resp_tec}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled={actionLoading === emp.cd_pessoaj}
                                onClick={() => updateStatus(emp.cd_pessoaj, "BLOQUEADA")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" /> Rejeitar
                              </button>
                              <button
                                disabled={actionLoading === emp.cd_pessoaj}
                                onClick={() => updateStatus(emp.cd_pessoaj, "ATIVA")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Aprovar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Secao de Resolvidas */}
            {resolvidas.length > 0 && (
              <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden opacity-75">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800">Histórico de Empresas ({resolvidas.length})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                      <tr>
                        <th className="px-6 py-4">Empresa</th>
                        <th className="px-6 py-4">CNPJ</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {resolvidas.map((emp) => (
                        <tr key={emp.cd_pessoaj}>
                          <td className="px-6 py-4 font-medium text-gray-900">{emp.nm_pessoaj}</td>
                          <td className="px-6 py-4">{emp.nr_cnpj}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              emp.status === "ATIVA" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
