"use client"

import { FormEvent, useEffect, useState } from "react"
import { BellRing, Plus, X } from "lucide-react"
import { toast } from "sonner"

import servicesGetAlertas from "@/server/(GET)-alertas"
import servicesCreateAlerta from "@/server/(POST)-alerta"
import servicesDeleteAlerta from "@/server/(DELETE)-alerta"
import { AlertaInteresse } from "@/types"

/** Alertas "me avise quando aparecer um anúncio de ..." da instituição. */
export default function AlertasInteresse() {
  const [alertas, setAlertas] = useState<AlertaInteresse[]>([])
  const [termo, setTermo] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    servicesGetAlertas().then((resposta) => {
      if (!("isError" in resposta)) setAlertas(resposta)
      setCarregando(false)
    })
  }, [])

  async function criar(e: FormEvent) {
    e.preventDefault()
    if (!termo.trim()) return
    setSalvando(true)
    const resposta = await servicesCreateAlerta(termo.trim())
    setSalvando(false)
    if ("isError" in resposta) {
      toast.error(resposta.message)
      return
    }
    setAlertas((atual) => [resposta, ...atual])
    setTermo("")
    toast.success(`Alerta criado para "${resposta.termo}"`)
  }

  async function remover(alerta: AlertaInteresse) {
    setAlertas((atual) => atual.filter((a) => a.id !== alerta.id))
    const resposta = await servicesDeleteAlerta(alerta.id)
    if ("isError" in resposta) {
      setAlertas((atual) => [alerta, ...atual])
      toast.error(resposta.message)
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5" aria-labelledby="alertas-titulo">
      <div className="flex items-start gap-3">
        <BellRing size={18} className="mt-0.5 text-blue-700 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="alertas-titulo" className="text-base font-semibold text-slate-900">Alertas de interesse</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Avisamos pelo sino quando outra instituição anunciar um insumo com o termo cadastrado.
          </p>
        </div>
      </div>

      <form onSubmit={criar} className="mt-4 flex gap-2">
        <label htmlFor="alerta-termo" className="sr-only">Termo do alerta</label>
        <input
          id="alerta-termo"
          type="text"
          value={termo}
          maxLength={100}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Ex.: luva nitrílica, dipirona, cateter"
          className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
        />
        <button
          type="submit"
          disabled={salvando || termo.trim().length < 2}
          className="h-10 px-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Plus size={16} aria-hidden="true" /> Criar alerta
        </button>
      </form>

      {!carregando && alertas.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">Nenhum alerta cadastrado.</p>
      )}
      {alertas.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {alertas.map((alerta) => (
            <li key={alerta.id} className="inline-flex items-center gap-1 h-8 pl-3 pr-1 rounded-full bg-slate-100 text-sm text-slate-800">
              {alerta.termo}
              <button
                type="button"
                onClick={() => remover(alerta)}
                aria-label={`Remover alerta ${alerta.termo}`}
                className="w-6 h-6 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
