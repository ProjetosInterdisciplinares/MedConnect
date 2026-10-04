"use client"

import React, { useEffect, useState } from "react"
import { Shield, TrendingUp, DollarSign, Package, Users, Activity, BarChart3, CheckCircle, Clock, LineChart } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts"
import { StatisticsResponse } from "@/types"
import servicesGetStatistics from "@/server/(GET)-statistics"
import AnimatedBackground from "@/components/ui/animated-background"

export default function DashboardsPage() {
  const [stats, setStats] = useState<StatisticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [rendasTimeFrame, setRendasTimeFrame] = useState<'diario' | 'semanal' | 'mensal' | 'anual'>('mensal')

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await servicesGetStatistics()
        if (response && !("isError" in response)) {
          setStats(response as StatisticsResponse)
        }
      } catch (err) {
        console.error("Erro ao carregar estatísticas", err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent w-full flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Carregando painel de indicadores...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-transparent w-full flex items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center text-center bg-white p-10 rounded-3xl shadow-xl max-w-md">
          <Activity size={64} className="text-red-500 mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-slate-800">Erro ao carregar dados</h2>
          <p className="text-slate-500 mt-2 font-medium">Não foi possível carregar os indicadores do sistema. Tente novamente mais tarde.</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
  }

  // Calculate some derived metrics
  const totalAnunciosCriados = 
    (stats.anuncios_ativos || 0) + 
    (stats.anuncios_negociacao || 0) + 
    (stats.anuncios_finalizados || 0) + 
    (stats.anuncios_inativos || 0)

  const conversionRate = totalAnunciosCriados > 0 
    ? ((stats.anuncios_finalizados || 0) / totalAnunciosCriados * 100).toFixed(1)
    : "0.0"

  return (
    <div className="min-h-screen bg-transparent w-full selection:bg-blue-500/20 antialiased relative">
      <AnimatedBackground />
      <div className="w-full max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header no padrão MedConnect */}
        <div className="mb-8 md:mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-900 text-white flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0 transform transition-transform hover:rotate-6">
              <BarChart3 size={24} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              Visão Geral
            </h1>
          </div>
          <p className="text-slate-500 text-sm md:text-base font-medium max-w-2xl ml-[60px]">
            Monitoramento em tempo real do ecossistema MedConnect
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          
          {/* Card: Volume Financeiro */}
          <div className="bg-white rounded-[1.25rem] p-6 shadow-sm hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out flex flex-col relative overflow-hidden group border border-transparent hover:border-blue-100">
            <div className="absolute top-0 left-0 h-1.5 w-0 bg-blue-600 group-hover:w-full transition-all duration-500 ease-out z-10" />
            <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:rotate-12 transition-all duration-500 group-hover:scale-110">
              <DollarSign size={120} />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-500 text-sm tracking-wide uppercase">Volume Transacionado</h3>
              <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shadow-sm">
                <DollarSign size={20} />
              </div>
            </div>
            <p className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight truncate group-hover:text-blue-700 transition-colors">
              {formatCurrency(stats.volume_financeiro || 0)}
            </p>
            <div className="flex items-center gap-1.5 mt-4 text-blue-600 text-sm font-bold bg-blue-50 w-fit px-2.5 py-1 rounded-lg">
              <TrendingUp size={14} />
              <span>Indicador de sucesso</span>
            </div>
          </div>

          {/* Card: Receita de Créditos */}
          <div className="bg-white rounded-[1.25rem] p-6 shadow-sm hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out flex flex-col relative overflow-hidden group border border-transparent hover:border-amber-100">
            <div className="absolute top-0 left-0 h-1.5 w-0 bg-amber-500 group-hover:w-full transition-all duration-500 ease-out z-10" />
            <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:rotate-12 transition-all duration-500 group-hover:scale-110">
              <DollarSign size={120} />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-500 text-sm tracking-wide uppercase">Venda de Créditos</h3>
              <div className="bg-amber-50 text-amber-500 p-2.5 rounded-xl shadow-sm">
                <DollarSign size={20} />
              </div>
            </div>
            <p className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight truncate group-hover:text-amber-600 transition-colors">
              {formatCurrency(stats.receita_creditos || 0)}
            </p>
            <div className="flex items-center gap-1.5 mt-4 text-amber-600 text-sm font-bold bg-amber-50 w-fit px-2.5 py-1 rounded-lg">
              <TrendingUp size={14} />
              <span>Receita da Plataforma</span>
            </div>
          </div>

          {/* Card: Créditos Consumidos */}
          <div className="bg-white rounded-[1.25rem] p-6 shadow-sm hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out flex flex-col relative overflow-hidden group border border-transparent hover:border-purple-100">
            <div className="absolute top-0 left-0 h-1.5 w-0 bg-purple-500 group-hover:w-full transition-all duration-500 ease-out z-10" />
            <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:-rotate-12 transition-all duration-500 group-hover:scale-110">
              <Activity size={120} />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-500 text-sm tracking-wide uppercase">Créditos Utilizados</h3>
              <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl shadow-sm">
                <Activity size={20} />
              </div>
            </div>
            <p className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight group-hover:text-purple-600 transition-colors">
              {stats.creditos_consumidos || 0}
            </p>
            <div className="mt-4 text-slate-500 text-sm font-medium">
              IA e Publicações
            </div>
          </div>

          {/* Card: Empresas */}
          <div className="bg-white rounded-[1.25rem] p-6 shadow-sm hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out flex flex-col relative overflow-hidden group border border-transparent hover:border-indigo-100">
            <div className="absolute top-0 left-0 h-1.5 w-0 bg-indigo-500 group-hover:w-full transition-all duration-500 ease-out z-10" />
            <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:-rotate-12 transition-all duration-500 group-hover:scale-110">
              <Users size={120} />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-500 text-sm tracking-wide uppercase">Empresas na Rede</h3>
              <div className="bg-indigo-50 text-indigo-500 p-2.5 rounded-xl shadow-sm">
                <Users size={20} />
              </div>
            </div>
            <p className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
              {stats.total_pessoas_juridicas}
            </p>
            <div className="mt-4 text-slate-500 text-sm font-medium">
              Hospitais e fornecedores
            </div>
          </div>

          {/* Card: Negociações Ativas */}
          <div className="bg-white rounded-[1.25rem] p-6 shadow-sm hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out flex flex-col relative overflow-hidden group border border-transparent hover:border-amber-100">
            <div className="absolute top-0 left-0 h-1.5 w-0 bg-amber-500 group-hover:w-full transition-all duration-500 ease-out z-10" />
            <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:rotate-12 transition-all duration-500 group-hover:scale-110">
              <Clock size={120} />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-500 text-sm tracking-wide uppercase">Em Negociação</h3>
              <div className="bg-amber-50 text-amber-500 p-2.5 rounded-xl shadow-sm">
                <Clock size={20} />
              </div>
            </div>
            <p className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight group-hover:text-amber-600 transition-colors">
              {stats.anuncios_negociacao || 0}
            </p>
            <div className="mt-4 text-slate-500 text-sm font-medium">
              Aguardando aceite
            </div>
          </div>

          {/* Card: Anúncios Finalizados */}
          <div className="bg-white rounded-[1.25rem] p-6 shadow-sm hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out flex flex-col relative overflow-hidden group border border-transparent hover:border-emerald-100">
            <div className="absolute top-0 left-0 h-1.5 w-0 bg-emerald-500 group-hover:w-full transition-all duration-500 ease-out z-10" />
            <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:-rotate-12 transition-all duration-500 group-hover:scale-110">
              <CheckCircle size={120} />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-500 text-sm tracking-wide uppercase">Repassados</h3>
              <div className="bg-emerald-50 text-emerald-500 p-2.5 rounded-xl shadow-sm">
                <CheckCircle size={20} />
              </div>
            </div>
            <p className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">
              {stats.anuncios_finalizados || 0}
            </p>
            <div className="mt-4 text-slate-500 text-sm font-medium">
              Taxa de conversão: <span className="font-bold text-slate-700">{conversionRate}%</span>
            </div>
          </div>

        </div>

        {/* Visual Charts section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
          
          {/* Gráfico de Pizza: Distribuição */}
          <div className="bg-white rounded-[1.25rem] p-6 lg:p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <div className="flex items-center justify-between mb-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Package size={20} />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800">Distribuição de Anúncios</h2>
              </div>
              <span className="text-sm font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{totalAnunciosCriados} Total</span>
            </div>
            
            <div className="flex-1 min-h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Ativos', value: stats.anuncios_ativos || 0, color: '#3b82f6' },
                      { name: 'Em Negociação', value: stats.anuncios_negociacao || 0, color: '#f59e0b' },
                      { name: 'Repassados', value: stats.anuncios_finalizados || 0, color: '#10b981' },
                      { name: 'Expirados', value: stats.anuncios_inativos || 0, color: '#94a3b8' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={1500}
                    animationBegin={200}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {
                      [
                        { name: 'Ativos', value: stats.anuncios_ativos || 0, color: '#3b82f6' },
                        { name: 'Em Negociação', value: stats.anuncios_negociacao || 0, color: '#f59e0b' },
                        { name: 'Repassados', value: stats.anuncios_finalizados || 0, color: '#10b981' },
                        { name: 'Expirados', value: stats.anuncios_inativos || 0, color: '#94a3b8' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))
                    }
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: 600, fontSize: '13px', color: '#475569' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Barras: Visão Geral do Banco */}
          <div className="bg-white rounded-[1.25rem] p-6 lg:p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-shadow duration-300 flex flex-col relative overflow-hidden">
            <div className="absolute -right-12 -top-12 p-4 opacity-[0.02] pointer-events-none">
              <Shield size={250} />
            </div>

            <div className="flex items-center justify-between mb-2 pb-4 border-b border-slate-100 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Shield size={20} />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800">Crescimento da Plataforma</h2>
              </div>
            </div>
            
            <div className="flex-1 min-h-[300px] w-full mt-4 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Materiais', total: stats.total_matmeds || 0 },
                    { name: 'Propostas', total: stats.total_propostas || 0 },
                    { name: 'Empresas', total: stats.total_pessoas_juridicas || 0 },
                  ]}
                  margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
                  barSize={40}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <RechartsTooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    itemStyle={{ fontWeight: 'bold', color: '#4f46e5' }}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="#4f46e5" 
                    radius={[6, 6, 0, 0]} 
                    animationDuration={1500}
                    animationBegin={400}
                  >
                    {
                      [
                        { name: 'Materiais', total: stats.total_matmeds || 0 },
                        { name: 'Propostas', total: stats.total_propostas || 0 },
                        { name: 'Empresas', total: stats.total_pessoas_juridicas || 0 },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#818cf8' : index === 1 ? '#4f46e5' : '#3730a3'} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 relative z-10">
              <div className="flex items-center gap-3 bg-emerald-50 w-fit px-4 py-2 rounded-full border border-emerald-100">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Sistema Online & Atualizado</p>
              </div>
            </div>
          </div>

        </div>

        {/* Histórico Temporal */}
        <div className="mt-6 lg:mt-8 bg-white rounded-[1.25rem] p-6 lg:p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500 fill-mode-both">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <LineChart size={20} />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">Evolução Mensal (Últimos 6 meses)</h2>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.historico || []}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorAnuncios" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPropostas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontWeight: 600, fontSize: '13px', color: '#475569' }}/>
                <Area type="monotone" name="Novos Anúncios" dataKey="anuncios" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAnuncios)" animationDuration={2000} />
                <Area type="monotone" name="Novas Propostas" dataKey="propostas" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorPropostas)" animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Histórico Temporal de Rendas (Créditos) */}
        <div className="mt-6 lg:mt-8 bg-white rounded-[1.25rem] p-6 lg:p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500 fill-mode-both">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
                <DollarSign size={20} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">Receita da Plataforma (Venda de Créditos)</h2>
            </div>
            
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              {['diario', 'semanal', 'mensal', 'anual'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setRendasTimeFrame(tf as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-colors ${rendasTimeFrame === tf ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tf === 'diario' ? 'Dias' : tf === 'semanal' ? 'Semanas' : tf === 'mensal' ? 'Meses' : 'Anos'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.historico_rendas?.[rendasTimeFrame] || []}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRenda" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `R$ ${val}`} />
                <RechartsTooltip 
                  formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Receita']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" name="Receita (R$)" dataKey="valor" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorRenda)" animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
