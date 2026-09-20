"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ShoppingCart, Handshake, CheckCircle, Package, Info, Building2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

import servicesGetAnuncioDetails from "@/server/(GET)-anuncio-details"
import servicesUpdateAnuncio from "@/server/(PUT)-anuncio"
import { Anuncio } from "@/types"
import AnimatedBackground from "@/components/ui/animated-background"

export default function AnuncioDetalhePage() {
  const { id } = useParams()
  const router = useRouter()

  const [anuncio, setAnuncio] = useState<Anuncio | null>(null)
  const [loading, setLoading] = useState(true)
  const [valorProposta, setValorProposta] = useState("")
  const [modo, setModo] = useState<"COMPRA" | "PROPOSTA">("COMPRA")
  
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await servicesGetAnuncioDetails(Number(id))
        if (!("isError" in res)) setAnuncio(res)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const valorUnitario = useMemo(() => {
    if (!anuncio) return 0
    return modo === "COMPRA" ? Number(anuncio.val_base) : Number(valorProposta || 0)
  }, [anuncio, modo, valorProposta])

  async function handleCompraDireta() {
    if (!anuncio) return
    const cdPessoa = Number(localStorage.getItem("userId"))
    if (!cdPessoa) { alert("Usuário não autenticado"); return }

    const res = await servicesUpdateAnuncio(Number(id), {
      cd_pessoa_compradora: cdPessoa,
      val_proposta: anuncio.val_base,
    })

    if ("isError" in res) { alert("Erro ao realizar compra: " + res.message); return }
    
    setSuccessMessage("Compra realizada com sucesso!")
    setIsSuccessOpen(true)
  }

  async function handleProposta() {
    if (!anuncio) return
    const cdPessoa = Number(localStorage.getItem("userId"))
    if (!cdPessoa) { alert("Usuário não autenticado"); return }
    if (!valorProposta || Number(valorProposta) <= 0) { alert("Informe um valor de proposta válido"); return }

    const res = await servicesUpdateAnuncio(Number(id), {
      cd_pessoa_compradora: cdPessoa,
      val_proposta: valorProposta,
    })

    if ("isError" in res) { alert("Erro ao enviar proposta: " + res.message); return }
    
    setSuccessMessage("Proposta enviada com sucesso!")
    setIsSuccessOpen(true)
  }

  function handleCloseSuccess() {
    setIsSuccessOpen(false)
    router.push("/caixa-de-propostas?tab=compras")
  }

  if (loading) return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
  if (!anuncio) return <div className="p-10 text-center font-bold text-slate-500">Anúncio não encontrado</div>

  const bloqueado = anuncio.ie_status !== "A"

  return (
    <div className="relative min-h-screen w-full antialiased selection:bg-teal-500/20">
      <AnimatedBackground />
      <div className="max-w-4xl mx-auto py-8 px-4 relative z-10">

        <div className="mb-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Anúncio <span className="text-teal-600">#{anuncio.nr_anuncio}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Veja os detalhes do insumo e escolha sua forma de negociação.
          </p>
        </div>
      </div>

      {/* informações do anúncio */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-600 to-teal-400" />
        <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
          <Info className="w-5 h-5 text-teal-600" />
          Informações do Anúncio
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8 text-sm">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantidade disponível</p>
            <p className="text-base font-bold text-slate-700 mt-0.5 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-400" />
              {anuncio.qtd_mat} <span className="text-xs font-normal text-slate-500">unidades</span>
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor Base</p>
            <p className="text-base font-bold text-slate-700 mt-0.5">
              R$ {Number(anuncio.val_base).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {anuncio.nr_lote && (
            <div><span className="font-bold text-slate-700">Lote:</span> <span className="text-slate-600">{anuncio.nr_lote}</span></div>
          )}
          {anuncio.cd_pessoa_anunciante && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-bold text-slate-700">Anunciante ID:</span> 
              <span className="text-slate-600">{anuncio.cd_pessoa_anunciante}</span>
            </div>
          )}
          {anuncio.ds_obs && (
            <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider block mb-1">Observações do Anunciante:</span>
              <span className="text-slate-600">{anuncio.ds_obs}</span>
            </div>
          )}
        </div>
      </div>

      {bloqueado ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 shadow-sm text-center text-rose-600 font-semibold text-sm">
          Este anúncio não está mais disponível para negociação.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <p className="text-lg font-bold text-slate-800 mb-5">Opções de Negociação</p>

          {/* toggle modo */}
          <div className="flex gap-2 mb-6">
            {(["COMPRA", "PROPOSTA"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  modo === m
                    ? "bg-teal-600 text-white shadow-md"
                    : "bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                {m === "COMPRA" ? "Compra Direta" : "Enviar Nova Proposta"}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {/* valor sugerido — só aparece no modo PROPOSTA */}
            {modo === "PROPOSTA" && (
              <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-semibold text-slate-700">Qual o seu valor sugerido? (R$)</label>
                <input
                  type="number"
                  value={valorProposta}
                  onChange={(e) => setValorProposta(e.target.value)}
                  placeholder="Ex: 12.50"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-sm shadow-inner"
                />
              </div>
            )}

            {/* resumo valor */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm">
              <span className="text-slate-500 font-medium tracking-wide uppercase text-xs">
                {modo === "COMPRA" ? "Valor total base" : "Sua Proposta Final"}
              </span>
              <span className="font-black text-teal-700 text-lg">
                R$ {valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* botão */}
            {modo === "COMPRA" ? (
              <button
                onClick={handleCompraDireta}
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-px cursor-pointer"
                style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
              >
                <ShoppingCart className="w-5 h-5" />
                Comprar pelo Valor Base
              </button>
            ) : (
              <button
                onClick={handleProposta}
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-px cursor-pointer"
                style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
              >
                <Handshake className="w-5 h-5" />
                Enviar Proposta ao Vendedor
              </button>
            )}

          </div>
        </div>
      )}

      <button
        onClick={() => router.back()}
        className="mt-6 text-sm font-bold text-slate-500 hover:text-teal-700 transition-colors flex items-center gap-1.5"
      >
        ‹ Voltar para o catálogo
      </button>

      </div>

      <Dialog open={isSuccessOpen} onOpenChange={(open) => { if (!open) handleCloseSuccess() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700 text-xl">
              <CheckCircle className="w-6 h-6" />
              Tudo Certo!
            </DialogTitle>
            <DialogDescription>
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 mt-2 text-sm text-center">
            Você pode acompanhar o andamento da negociação na sua <strong>Caixa de Propostas</strong>.
          </div>
          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={handleCloseSuccess}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition-colors w-full sm:w-auto cursor-pointer"
            >
              Ir para Caixa de Propostas
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}