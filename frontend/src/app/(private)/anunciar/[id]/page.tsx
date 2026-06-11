"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ShoppingCart, Handshake } from "lucide-react"

import servicesGetAnuncioDetails from "@/server/(GET)-anuncio-details"
import servicesUpdateAnuncio from "@/server/(PUT)-anuncio"
import { Anuncio } from "@/types"

export default function AnuncioDetalhePage() {
  const { id } = useParams()
  const router = useRouter()

  const [anuncio, setAnuncio] = useState<Anuncio | null>(null)
  const [loading, setLoading] = useState(true)
  const [valorProposta, setValorProposta] = useState("")
  const [modo, setModo] = useState<"COMPRA" | "PROPOSTA">("COMPRA")

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
      val_aceito: anuncio.val_base,
      ie_status: "N",
    })

    if ("isError" in res) { alert("Erro ao realizar compra: " + res.message); return }
    alert("Solicitação de compra realizada com sucesso!")
    router.push("/caixa-de-propostas?tab=compras")
  }

  async function handleProposta() {
    if (!anuncio) return
    const cdPessoa = Number(localStorage.getItem("userId"))
    if (!cdPessoa) { alert("Usuário não autenticado"); return }
    if (!valorProposta || Number(valorProposta) <= 0) { alert("Informe um valor de proposta válido"); return }

    const res = await servicesUpdateAnuncio(Number(id), {
      cd_pessoa_compradora: cdPessoa,
      val_proposta: valorProposta,
      ie_status: "N",
    })

    if ("isError" in res) { alert("Erro ao enviar proposta: " + res.message); return }
    alert("Proposta enviada com sucesso!")
    router.push("/caixa-de-propostas?tab=compras")
  }

  if (loading) return <div className="p-10 text-zinc-500">Carregando...</div>
  if (!anuncio) return <div className="p-10 text-zinc-500">Anúncio não encontrado</div>

  const bloqueado = anuncio.ie_status !== "A"

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sky-900">
          Anúncio #{anuncio.nr_anuncio}
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Veja os detalhes abaixo e escolha como deseja negociar.
        </p>
      </div>

      {/* informações do anúncio */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 md:p-8 shadow-sm mb-6">
        <p className="text-base font-semibold text-zinc-700 mb-5">Informações do Anúncio</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
          <p><span className="font-bold text-zinc-700">Número do Anúncio:</span> <span className="text-zinc-600">{anuncio.nr_anuncio}</span></p>
          <p><span className="font-bold text-zinc-700">Status:</span> <span className="text-zinc-600">{anuncio.ie_status}</span></p>
          <p><span className="font-bold text-zinc-700">Quantidade disponível:</span> <span className="text-zinc-600">{anuncio.qtd_mat}</span></p>
          <p><span className="font-bold text-zinc-700">Valor base:</span> <span className="text-zinc-600">R$ {Number(anuncio.val_base).toFixed(2)}</span></p>
          {anuncio.nr_lote && (
            <p><span className="font-bold text-zinc-700">Lote:</span> <span className="text-zinc-600">{anuncio.nr_lote}</span></p>
          )}
          {anuncio.cd_pessoa_anunciante && (
            <p><span className="font-bold text-zinc-700">Anunciante:</span> <span className="text-zinc-600">{anuncio.cd_pessoa_anunciante}</span></p>
          )}
          {anuncio.ds_obs && (
            <p className="sm:col-span-2">
              <span className="font-bold text-zinc-700">Observações:</span>{" "}
              <span className="text-zinc-600">{anuncio.ds_obs}</span>
            </p>
          )}
        </div>
      </div>

      {bloqueado ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 shadow-sm text-center text-red-500 font-semibold text-sm">
          Este anúncio não está disponível para negociação.
        </div>
      ) : (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <p className="text-base font-semibold text-zinc-700 mb-5">Fazer Oferta</p>

          {/* toggle modo */}
          <div className="flex gap-2 mb-6">
            {(["COMPRA", "PROPOSTA"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                  modo === m
                    ? "bg-sky-950 text-white border-sky-950"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:text-zinc-700"
                }`}
              >
                {m === "COMPRA" ? "Compra Direta" : "Proposta"}
              </button>
            ))}
          </div>

          <div className="space-y-5">

            {/* valor sugerido — só aparece no modo PROPOSTA */}
            {modo === "PROPOSTA" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-zinc-700">Valor proposto (R$)</label>
                <input
                  type="number"
                  value={valorProposta}
                  onChange={(e) => setValorProposta(e.target.value)}
                  placeholder="Ex: 12,50"
                  className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-sm"
                />
              </div>
            )}

            {/* resumo valor */}
            <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg px-4 py-3 text-sm">
              <span className="text-zinc-500">
                {modo === "COMPRA" ? "Valor base" : "Valor proposto"}
              </span>
              <span className="font-bold text-zinc-800 text-base">
                R$ {valorUnitario.toFixed(2)}
              </span>
            </div>

            {/* botão */}
            {modo === "COMPRA" ? (
              <button
                onClick={handleCompraDireta}
                className="w-full flex items-center justify-center gap-2 bg-sky-950 hover:bg-sky-900 text-white font-bold py-3 rounded-lg transition-colors text-sm cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                Comprar Agora
              </button>
            ) : (
              <button
                onClick={handleProposta}
                className="w-full flex items-center justify-center gap-2 bg-sky-950 hover:bg-sky-900 text-white font-bold py-3 rounded-lg transition-colors text-sm cursor-pointer"
              >
                <Handshake className="w-4 h-4" />
                Enviar Proposta
              </button>
            )}

          </div>
        </div>
      )}

      <button
        onClick={() => router.back()}
        className="mt-6 flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
      >
        ‹ Voltar
      </button>

    </div>
  )
}