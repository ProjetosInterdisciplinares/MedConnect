"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Building2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Eye, FileText, Inbox, Clock, Ban, ArrowRight, Mail, User, Search, Filter } from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import AnimatedBackground from "@/components/ui/animated-background"
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

interface Empresa {
  cd_pessoaj: number
  nm_pessoaj: string
  razao_social: string
  nr_cnpj: string
  email_pj: string
  resp_tec: string
  status: string
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
    } catch (error) {
      toast.error("Erro ao carregar a lista de empresas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmpresas()
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
      
      toast.success(`Empresa ${novoStatus === "ATIVA" ? "aprovada" : "rejeitada"} com sucesso!`)
      fetchEmpresas() // recarrega a lista
    } catch (error) {
      toast.error("Erro ao atualizar o status")
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
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissão para acessar esta área.</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full antialiased bg-slate-50/50 selection:bg-blue-500/20 pb-12">
      <AnimatedBackground />
      <div className="max-w-[1200px] mx-auto py-8 md:py-12 px-4 sm:px-6 lg:px-8 font-sans relative z-10">
        
        {/* Header da Página */}
        <div className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                <Building2 size={20} />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                Painel Administrativo
              </h1>
            </div>
            <p className="text-slate-500 text-sm md:text-base max-w-2xl ml-[52px]">
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

        {/* Layout Master-Detail / Sidebar */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Navegação Lateral */}
          <aside className="w-full md:w-72 shrink-0 flex flex-col gap-2">
            {TABS.map(({ id, label, description, icon: Icon }) => {
              const isActive = activeTab === id
              
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`relative w-full text-left flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 group ${
                    isActive
                      ? "bg-white shadow-sm ring-1 ring-slate-200/50"
                      : "hover:bg-white/50"
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-900 rounded-r-full" />
                  )}
                  <div className={`shrink-0 rounded-xl p-2 transition-colors ${
                    isActive ? "bg-blue-50 text-blue-900" : "bg-slate-100 text-slate-500 group-hover:text-blue-900 group-hover:bg-blue-50/50"
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-sm flex items-center justify-between ${isActive ? "text-slate-800" : "text-slate-600"}`}>
                      {label}
                      {id === "pendentes" && pendentesGerais.length > 0 && (
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black">
                          {pendentesGerais.length}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">
                      {description}
                    </p>
                  </div>
                </button>
              )
            })}
          </aside>

          {/* Área de Conteúdo */}
          <div className="flex-1 w-full min-w-0">
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
        {selectedEmpresa && (
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
            <DialogHeader className="m-0 bg-blue-600 px-6 py-5 rounded-t-xl border-b border-blue-950">
              <DialogTitle className="flex items-center justify-between text-xl font-black text-white pr-6">
                Detalhes do Credenciamento
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                  ID #{selectedEmpresa.cd_pessoaj}
                </span>
              </DialogTitle>
              <DialogDescription className="text-blue-100 mt-2">
                Informações completas do usuário/empresa. Visualização somente-leitura.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Destaque Principal */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 text-blue-900">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-800">{selectedEmpresa.nm_pessoaj}</h4>
                  <p className="text-sm text-slate-500 mt-1">{selectedEmpresa.razao_social}</p>
                </div>
              </div>

              {/* Informações Detalhadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">CNPJ</p>
                  <p className="font-semibold text-slate-700 flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    {selectedEmpresa.nr_cnpj}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">E-mail de Contato</p>
                  <p className="font-semibold text-slate-700 flex items-center gap-2">
                    <Mail size={16} className="text-slate-400" />
                    {selectedEmpresa.email_pj}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm md:col-span-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Responsável Técnico</p>
                  <p className="font-semibold text-slate-700 flex items-center gap-2">
                    <User size={16} className="text-slate-400" />
                    {selectedEmpresa.resp_tec}
                  </p>
                </div>
              </div>

              {/* Status Section */}
              <div className={`p-5 rounded-2xl border flex items-center justify-between ${
                selectedEmpresa.status === "ATIVA" ? "bg-emerald-50 border-emerald-200" :
                selectedEmpresa.status === "BLOQUEADA" ? "bg-rose-50 border-rose-200" :
                "bg-amber-50 border-amber-200"
              }`}>
                <div>
                  <p className={`text-[10px] uppercase font-bold mb-1 ${
                    selectedEmpresa.status === "ATIVA" ? "text-emerald-600" :
                    selectedEmpresa.status === "BLOQUEADA" ? "text-rose-600" :
                    "text-amber-600"
                  }`}>
                    Status Atual da Empresa
                  </p>
                  <p className={`font-black text-lg ${
                    selectedEmpresa.status === "ATIVA" ? "text-emerald-800" :
                    selectedEmpresa.status === "BLOQUEADA" ? "text-rose-800" :
                    "text-amber-800"
                  }`}>
                    {selectedEmpresa.status === "BLOQUEADA" ? "REJEITADA / BLOQUEADA" : selectedEmpresa.status}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm border ${
                  selectedEmpresa.status === "ATIVA" ? "border-emerald-200 text-emerald-600" :
                  selectedEmpresa.status === "BLOQUEADA" ? "border-rose-200 text-rose-600" :
                  "border-amber-200 text-amber-600"
                }`}>
                  {selectedEmpresa.status === "ATIVA" ? <CheckCircle2 className="w-6 h-6" /> :
                   selectedEmpresa.status === "BLOQUEADA" ? <Ban className="w-6 h-6" /> :
                   <Clock className="w-6 h-6" />}
                </div>
              </div>
            </div>

            {/* Ações Dinâmicas baseadas no Status Atual */}
            <div className="bg-white px-6 py-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedEmpresa(null)}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              >
                Fechar
              </button>
              
              <div className="flex w-full sm:w-auto gap-3">
                {/* Se a empresa for a do próprio admin, não mostra ações */}
                {selectedEmpresa.cd_pessoaj !== loggedUserId && (
                  <>
                    {/* Se a empresa estiver PENDENTE ou ATIVA, permite Bloquear */}
                    {(selectedEmpresa.status === "PENDENTE" || selectedEmpresa.status === "ATIVA") && (
                      <button 
                        disabled={actionLoading === selectedEmpresa.cd_pessoaj}
                        onClick={() => { updateStatus(selectedEmpresa.cd_pessoaj, "BLOQUEADA"); setSelectedEmpresa(null); }} 
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-white text-rose-600 border border-rose-200 hover:border-rose-300 hover:bg-rose-50 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" /> {selectedEmpresa.status === "ATIVA" ? "Bloquear Cadastro" : "Rejeitar"}
                      </button>
                    )}
                    
                    {/* Se a empresa estiver PENDENTE ou BLOQUEADA, permite Aprovar */}
                    {(selectedEmpresa.status === "PENDENTE" || selectedEmpresa.status === "BLOQUEADA") && (
                      <button 
                        disabled={actionLoading === selectedEmpresa.cd_pessoaj}
                        onClick={() => { updateStatus(selectedEmpresa.cd_pessoaj, "ATIVA"); setSelectedEmpresa(null); }} 
                        className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-950 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 group disabled:opacity-50"
                      >
                        {selectedEmpresa.status === "BLOQUEADA" ? "Reativar Cadastro" : "Aprovar"} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
