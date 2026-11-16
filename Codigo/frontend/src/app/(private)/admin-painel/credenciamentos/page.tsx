"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Building2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Eye, FileText, Inbox, Clock, Ban, ArrowRight, Mail, User, Search, Filter, Phone, MapPin } from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"

import { Pagination } from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { AuthManager } from "@/lib/AuthManager"
import { BarraAbas } from "@/components/layout/SecaoTabs"
import { avisarSolicitacoesAtualizadas } from "@/lib/solicitacoes"
import VerificacaoCNPJ from "@/components/admin/VerificacaoCNPJ"

interface Empresa {
  cd_pessoaj: number
  nm_pessoaj: string
  razao_social: string
  nr_cnpj: string
  email_pj: string
  resp_tec: string
  status: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  telefone?: string
}

const TABS = [
  {
    id: "pendentes",
    label: "Aguardando Aprovação",
    description: "Empresas aguardando credenciamento",
    icon: Clock,
  },
  {
    id: "historico",
    label: "Histórico",
    description: "Empresas já avaliadas",
    icon: FileText,
  },
]

const ITEMS_PER_PAGE = 5

const STATUS_INFO: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  PENDENTE: { label: "Aguardando aprovação", badge: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  ATIVA: { label: "Ativa", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  BLOQUEADA: { label: "Rejeitada / bloqueada", badge: "bg-rose-50 text-rose-700 border-rose-200", icon: Ban },
}

function DetalheItem({
  icon: Icon,
  label,
  value,
  wide = false,
  mono = false,
}: {
  icon: React.ElementType
  label: string
  value?: string | null
  wide?: boolean
  mono?: boolean
}) {
  return (
    <div className={`py-3 border-b border-slate-100 min-w-0 ${wide ? "sm:col-span-2 border-b-0" : ""}`}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Icon size={13} className="text-slate-400 shrink-0" aria-hidden="true" /> {label}
      </dt>
      <dd className={`mt-1 text-sm font-medium break-words ${value ? "text-slate-800" : "text-slate-400"} ${mono ? "tabular-nums" : ""}`}>
        {value || "Não informado"}
      </dd>
    </div>
  )
}

export default function AdminCredenciamentos() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [acessoNegado, setAcessoNegado] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("pendentes")
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null)
  const [loggedUserId, setLoggedUserId] = useState<number | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [historyFilter, setHistoryFilter] = useState("TODAS")
  const [currentPage, setCurrentPage] = useState(1)

  const fetchEmpresas = async () => {
    try {
      setLoading(true)
      const token = AuthManager.getInstance().getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res = await fetch(`${apiUrl}/api/medconnect/admin/pessoas/`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      if (res.status === 401 || res.status === 403) {
        setAcessoNegado(true)
        return
      }
      if (!res.ok) throw new Error("Erro ao carregar")
      const data = await res.json()
      setEmpresas(data)
      return data as Empresa[]
    } catch (error) {
      toast.error("Erro ao carregar a lista de empresas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Abre direto a solicitação escolhida no sininho (?empresa=ID)
    const alvo = Number(new URLSearchParams(window.location.search).get("empresa"))
    fetchEmpresas().then((lista) => {
      if (!alvo || !lista) return
      const emp = lista.find((e) => e.cd_pessoaj === alvo)
      if (emp) setSelectedEmpresa(emp)
      window.history.replaceState(null, "", window.location.pathname)
    })
    const userId = String(AuthManager.getInstance().getUserId())
    if (userId) setLoggedUserId(Number(userId))
  }, [])

  // Reseta a página ao mudar de aba ou filtro
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchTerm, historyFilter])

  const updateStatus = async (id: number, novoStatus: string) => {
    try {
      setActionLoading(id)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const token = AuthManager.getInstance().getToken()
      const res = await fetch(`${apiUrl}/api/medconnect/admin/pessoas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: novoStatus }),
      })

      if (!res.ok) throw new Error("Erro ao atualizar")

      toast.success(novoStatus === "ATIVA" ? "Credenciamento aprovado" : "Credenciamento rejeitado", {
        description: novoStatus === "ATIVA" ? "A empresa já pode acessar a plataforma." : "A empresa foi movida para o histórico.",
      })
      fetchEmpresas() // recarrega a lista
      avisarSolicitacoesAtualizadas() // atualiza menu e sininho

      // Atualiza o state do modal se ele estiver aberto
      setSelectedEmpresa(prev => {
        if (prev && prev.cd_pessoaj === id) {
          return { ...prev, status: novoStatus }
        }
        return prev
      })
    } catch (error) {
      toast.error("Não foi possível atualizar o status", {
        description: "Atualize a lista e tente novamente.",
      })
      fetchEmpresas()
    } finally {
      setActionLoading(null)
    }
  }

  // Memoizando a filtragem
  const { pendentesGerais, itensFiltrados } = useMemo(() => {
    const pendentes = empresas.filter(e => e.status === "PENDENTE")

    let baseList = activeTab === "pendentes"
      ? pendentes
      : empresas.filter(e => e.status !== "PENDENTE")

    // Aplicar Filtro de Status no Histórico
    if (activeTab === "historico" && historyFilter !== "TODAS") {
      baseList = baseList.filter(e => e.status === historyFilter)
    }

    // Aplicar Termo de Busca
    if (searchTerm.trim() !== "") {
      const term = searchTerm.trim().toLowerCase()
      if (term.startsWith("#")) {
        // Filtra por ID
        const idSearch = term.substring(1)
        baseList = baseList.filter(e => e.cd_pessoaj.toString().includes(idSearch))
      } else {
        // Filtra por Nome, Razão Social ou CNPJ
        baseList = baseList.filter(e =>
          e.nm_pessoaj.toLowerCase().includes(term) ||
          e.razao_social.toLowerCase().includes(term) ||
          e.nr_cnpj.includes(term)
        )
      }
    }

    return {
      pendentesGerais: pendentes,
      itensFiltrados: baseList
    }
  }, [empresas, activeTab, historyFilter, searchTerm])

  const totalItems = itensFiltrados.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  const paginatedItens = itensFiltrados.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  if (acessoNegado) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <AlertCircle className="w-16 h-16 text-danger mb-4" />
        <h1 className="text-3xl font-bold text-heading mb-2">Acesso Negado</h1>
        <p className="text-muted">Você não tem permissão para acessar esta área.</p>
      </div>
    )
  }

  return (
    <div className="relative w-full antialiased">

      <div className="w-full font-sans relative z-10">
        <BarraAbas
          label="Abas de credenciamento"
          itens={TABS.map(({ id, label }) => ({
            key: id,
            label,
            ativa: activeTab === id,
            badge: id === "pendentes" ? pendentesGerais.length : 0,
            onClick: () => setActiveTab(id),
          }))}
        />

        {/* Header da Página */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="sr-only">Solicitações de credenciamento</h1>
            <p className="text-sm text-slate-500 max-w-2xl">
              Gerencie as solicitações de credenciamento e verifique o histórico das empresas parceiras.
            </p>
          </div>
          <button
            onClick={fetchEmpresas}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-sm font-semibold text-slate-600 w-fit disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        <div>
          <div className="w-full min-w-0">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col mb-4">

              {/* Cabeçalho Interno e Filtros */}
              <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {activeTab === "pendentes" ? "Solicitações Pendentes" : "Histórico de Avaliações"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {activeTab === "pendentes"
                      ? "Novos perfis aguardando avaliação da equipe."
                      : "Empresas que já passaram por análise."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Busca */}
                  <div className="relative group min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-900 transition-colors" />
                    <input
                      type="text"
                      placeholder="Buscar Nome, CNPJ ou use # para ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Filtro de Status (Apenas Histórico) */}
                  {activeTab === "historico" && (
                    <div className="relative min-w-[160px]">
                      <Select value={historyFilter} onValueChange={(val) => setHistoryFilter(val || "TODAS")}>
                        <SelectTrigger className="w-full pl-10 bg-slate-50 border-slate-200 rounded-xl h-[38px] text-slate-600 font-medium focus:ring-blue-900/20 focus:border-blue-900">
                          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl bg-white">
                          <SelectItem value="TODAS" className="cursor-pointer rounded-lg hover:bg-slate-50">Todos os Status</SelectItem>
                          <SelectItem value="ATIVA" className="cursor-pointer rounded-lg hover:bg-slate-50">Aprovadas</SelectItem>
                          <SelectItem value="BLOQUEADA" className="cursor-pointer rounded-lg hover:bg-slate-50">Rejeitadas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] gap-4">
                  <Spinner className="w-10 h-10 text-blue-900" />
                  <p className="text-slate-500 font-medium animate-pulse">Carregando dados...</p>
                </div>
              ) : paginatedItens.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-100">
                    <Inbox className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="font-bold text-xl text-slate-700 mb-2">Lista Vazia</h3>
                  <p className="text-slate-500 text-base max-w-md">
                    {searchTerm
                      ? "Nenhuma empresa encontrada com os termos informados."
                      : "Todas as empresas já foram analisadas ou não há novas solicitações no momento."}
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto min-h-[400px]">
                  <ul className="divide-y divide-slate-100">
                    {paginatedItens.map((emp) => {
                      let badgeStyle = "bg-amber-50 text-amber-700 border-amber-200"
                      let badgeIcon = <Clock size={12} className="mr-1.5" />
                      let badgeText = "AGUARDANDO"

                      if (emp.status === "ATIVA") {
                        badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200"
                        badgeIcon = <CheckCircle2 size={12} className="mr-1.5" />
                        badgeText = "ATIVA"
                      } else if (emp.status === "BLOQUEADA") {
                        badgeStyle = "bg-rose-50 text-rose-700 border-rose-200"
                        badgeIcon = <Ban size={12} className="mr-1.5" />
                        badgeText = "REJEITADA / BLOQUEADA"
                      }

                      return (
                        <li
                          key={emp.cd_pessoaj}
                          className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 hover:bg-slate-50/80 transition-colors cursor-pointer"
                          onClick={() => setSelectedEmpresa(emp)}
                        >
                          {/* Info da Empresa */}
                          <div className="flex items-start gap-5 flex-1 min-w-0">
                            <div className="hidden md:flex mt-1 w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-white items-center justify-center shrink-0 border border-slate-200 transition-colors">
                              <Building2 className="w-6 h-6 text-slate-400 group-hover:text-blue-900 transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ID #{emp.cd_pessoaj}</span>
                                <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeStyle}`}>
                                  {badgeIcon} {badgeText}
                                </span>
                              </div>
                              <h3 className="font-semibold text-lg text-slate-800 truncate pr-4 group-hover:text-blue-900 transition-colors">
                                {emp.nm_pessoaj}
                              </h3>

                              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm mt-2 text-slate-500">
                                <span>CNPJ: {emp.nr_cnpj}</span>
                                <span className="hidden sm:inline">•</span>
                                <span>Resp: {emp.resp_tec}</span>
                              </div>
                            </div>
                          </div>

                          {/* Ações Rápidas (Aparecem apenas se for pendente) */}
                          <div className="flex items-center justify-between md:justify-end gap-2 pl-0 md:pl-6 md:border-l border-slate-100">
                            <div className="flex items-center gap-2">
                              {emp.status === "PENDENTE" && emp.cd_pessoaj !== loggedUserId && (
                                <>
                                  <button
                                    disabled={actionLoading === emp.cd_pessoaj}
                                    onClick={(e) => { e.stopPropagation(); updateStatus(emp.cd_pessoaj, "BLOQUEADA"); }}
                                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                                    title="Rejeitar"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                  <button
                                    disabled={actionLoading === emp.cd_pessoaj}
                                    onClick={(e) => { e.stopPropagation(); updateStatus(emp.cd_pessoaj, "ATIVA"); }}
                                    className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50"
                                    title="Aprovar"
                                  >
                                    <CheckCircle2 className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              <div className="p-2.5 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all" title="Ver Detalhes">
                                <Eye className="w-5 h-5" />
                              </div>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            )}
          </div>

        </div>
      </div>

      {/* Modal de Detalhes da Empresa */}
      <Dialog open={!!selectedEmpresa} onOpenChange={(open) => !open && setSelectedEmpresa(null)}>
        {selectedEmpresa && (() => {
          const status = STATUS_INFO[selectedEmpresa.status] ?? STATUS_INFO.PENDENTE
          const StatusIcon = status.icon
          const endereco = selectedEmpresa.cep
            ? [
                [selectedEmpresa.logradouro, selectedEmpresa.numero].filter(Boolean).join(", "),
                selectedEmpresa.complemento,
                selectedEmpresa.bairro,
                [selectedEmpresa.cidade, selectedEmpresa.estado].filter(Boolean).join("/"),
                `CEP ${selectedEmpresa.cep}`,
              ].filter(Boolean).join(" · ")
            : null

          return (
            <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col bg-white border-slate-200">
              <div className="px-6 pt-5 pb-4 border-b border-slate-100 text-left">
                <div className="flex items-center gap-2 pr-8">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${status.badge}`}>
                    <StatusIcon size={12} aria-hidden="true" /> {status.label}
                  </span>
                  <span className="text-xs font-medium text-slate-400 tabular-nums">ID #{selectedEmpresa.cd_pessoaj}</span>
                </div>
                <DialogTitle className="mt-2 text-lg font-bold text-slate-900 leading-snug pr-8 break-words">
                  {selectedEmpresa.nm_pessoaj}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 break-words">
                  {selectedEmpresa.razao_social}
                </DialogDescription>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <DetalheItem icon={FileText} label="CNPJ" value={selectedEmpresa.nr_cnpj} mono />
                  <DetalheItem icon={Phone} label="Telefone" value={selectedEmpresa.telefone} mono />
                  <DetalheItem icon={Mail} label="E-mail" value={selectedEmpresa.email_pj} />
                  <DetalheItem icon={User} label="Responsável técnico" value={selectedEmpresa.resp_tec} />
                  <DetalheItem icon={MapPin} label="Endereço" value={endereco} wide />
                </dl>

                <VerificacaoCNPJ empresaId={selectedEmpresa.cd_pessoaj} />
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmpresa(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Fechar
                </button>

                {selectedEmpresa.cd_pessoaj !== loggedUserId && (
                  <div className="flex gap-2">
                    {(selectedEmpresa.status === "PENDENTE" || selectedEmpresa.status === "ATIVA") && (
                      <button
                        disabled={actionLoading === selectedEmpresa.cd_pessoaj}
                        onClick={() => { updateStatus(selectedEmpresa.cd_pessoaj, "BLOQUEADA"); setSelectedEmpresa(null); }}
                        className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" aria-hidden="true" /> {selectedEmpresa.status === "ATIVA" ? "Bloquear" : "Rejeitar"}
                      </button>
                    )}
                    {(selectedEmpresa.status === "PENDENTE" || selectedEmpresa.status === "BLOQUEADA") && (
                      <button
                        disabled={actionLoading === selectedEmpresa.cd_pessoaj}
                        onClick={() => { updateStatus(selectedEmpresa.cd_pessoaj, "ATIVA"); setSelectedEmpresa(null); }}
                        className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {selectedEmpresa.status === "BLOQUEADA" ? "Reativar" : "Aprovar"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          )
        })()}
      </Dialog>
    </div>
  )
}
