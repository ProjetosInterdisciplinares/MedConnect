"use client"

import { useState, useRef } from "react"
import { PessoaJuridica } from "@/types"
import { Pencil, Camera, Loader2, BadgeCheck } from "lucide-react"
import servicesUpdatePessoaJuridica from "@/server/(PUT)-pessoa-juridica"
import { formatCNPJ } from "@/lib/format/format-document"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Props {
  empresa: PessoaJuridica | null
}

const INPUT = "w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
const INPUT_LEITURA = "w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600 outline-none"

function Campo({ rotulo, children, largo = false }: { rotulo: string; children: React.ReactNode; largo?: boolean }) {
  return (
    <div className={`min-w-0 ${largo ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900 break-words">{children}</dd>
    </div>
  )
}

function Rotulo({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1.5">{children}</label>
}

export default function PerfilHeader({ empresa }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [erro, setErro] = useState("")
  const [formData, setFormData] = useState({
    razao_social: "",
    email_pj: "",
    resp_tec: "",
    imagem_perfil: "" as string | null,
    telefone: "",
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    latitude: null as number | null,
    longitude: null as number | null,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleOpenEdit() {
    if (!empresa) return
    setErro("")
    setFormData({
      razao_social: empresa.razao_social,
      email_pj: empresa.email_pj,
      resp_tec: empresa.resp_tec,
      imagem_perfil: empresa.imagem_perfil || null,
      telefone: empresa.telefone || "",
      cep: empresa.cep || "",
      logradouro: empresa.logradouro || "",
      numero: empresa.numero || "",
      bairro: empresa.bairro || "",
      cidade: empresa.cidade || "",
      estado: empresa.estado || "",
      latitude: empresa.latitude || null,
      longitude: empresa.longitude || null,
    })
    setIsEditing(true)
  }

  async function fetchAddressByCep(cep: string) {
    if (cep.length !== 9) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep.replace("-", "")}/json/`)
      const data = await res.json()
      if (data.erro) return

      setFormData((prev) => ({
        ...prev,
        logradouro: data.logradouro || "",
        bairro: data.bairro || "",
        cidade: data.localidade || "",
        estado: data.uf || "",
      }))

      // Coordenadas aproximadas para o cálculo de distância no catálogo
      const addressString = `${data.logradouro || ""}, ${data.localidade || ""}, ${data.uf || ""}, Brazil`
      const coordRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}`)
      const coordData = await coordRes.json()
      if (coordData && coordData.length > 0) {
        setFormData((prev) => ({ ...prev, latitude: parseFloat(coordData[0].lat), longitude: parseFloat(coordData[0].lon) }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => setFormData((prev) => ({ ...prev, imagem_perfil: event.target?.result as string }))
    reader.readAsDataURL(file)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!empresa) return
    setIsSaving(true)
    setErro("")
    const res = await servicesUpdatePessoaJuridica(empresa.cd_pessoaj, formData)
    setIsSaving(false)
    if ("isError" in res && res.isError) {
      setErro(res.message || "Não foi possível salvar. Tente novamente.")
      return
    }
    // Recarrega para atualizar os dados no menu e nas demais telas
    window.location.reload()
  }

  const iniciais = empresa?.nm_pessoaj?.substring(0, 2).toUpperCase() ?? "PJ"
  const endereco = empresa?.cep
    ? [
        [empresa.logradouro, empresa.numero].filter(Boolean).join(", "),
        empresa.bairro,
        [empresa.cidade, empresa.estado].filter(Boolean).join("/"),
        `CEP ${empresa.cep}`,
      ].filter(Boolean).join(" · ")
    : null

  return (
    <>
      <section className="bg-white border border-slate-200 rounded-xl p-5 h-full" aria-labelledby="perfil-dados-titulo">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 shrink-0 rounded-full bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center overflow-hidden">
            {empresa?.imagem_perfil ? (
              <img src={empresa.imagem_perfil} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-blue-800">{iniciais}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="perfil-dados-titulo" className="text-lg font-semibold text-slate-900 leading-snug">
              {empresa?.razao_social ?? <span className="inline-block w-48 h-5 rounded bg-slate-100 animate-pulse align-middle" />}
            </h2>
            {empresa && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-600">
                <BadgeCheck size={14} className="text-blue-700" aria-hidden="true" />
                Instituição credenciada
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleOpenEdit}
            disabled={!empresa}
            className="shrink-0 inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <Pencil size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Editar dados</span>
            <span className="sm:hidden">Editar</span>
          </button>
        </div>

        <dl className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Campo rotulo="CNPJ"><span className="tabular-nums">{empresa?.nr_cnpj ? formatCNPJ(empresa.nr_cnpj) : "—"}</span></Campo>
          <Campo rotulo="Responsável técnico">{empresa?.resp_tec || "—"}</Campo>
          <Campo rotulo="E-mail">{empresa?.email_pj || "—"}</Campo>
          <Campo rotulo="Telefone">
            {empresa?.telefone ? <span className="tabular-nums">{empresa.telefone}</span> : <span className="font-normal text-slate-500">Não informado</span>}
          </Campo>
          <Campo rotulo="Endereço" largo>
            {endereco ?? <span className="font-normal text-slate-500">Não informado. Sem endereço, o catálogo não calcula distâncias.</span>}
          </Campo>
        </dl>
      </section>

      {/* ─── Edição ─── */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[520px] p-6 gap-0 bg-white max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogTitle className="text-lg font-semibold text-slate-900">Editar dados da instituição</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-600">
              Contato, endereço e imagem exibidos para as outras instituições.
            </DialogDescription>

            <div className="mt-5 flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-16 h-16 shrink-0 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center hover:border-blue-600 transition-colors"
                aria-label="Alterar imagem de perfil"
              >
                {formData.imagem_perfil
                  ? <img src={formData.imagem_perfil} alt="" className="w-full h-full object-cover" />
                  : <Camera className="w-6 h-6 text-slate-400" aria-hidden="true" />}
              </button>
              <div className="text-sm">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="font-semibold text-blue-700 hover:underline">
                  Alterar imagem
                </button>
                <p className="text-xs text-slate-500 mt-0.5">PNG ou JPG.</p>
              </div>
              <input type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <Rotulo htmlFor="pf-razao">Razão social</Rotulo>
                <input id="pf-razao" required type="text" value={formData.razao_social} onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })} className={INPUT} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Rotulo htmlFor="pf-email">E-mail</Rotulo>
                  <input id="pf-email" required type="email" value={formData.email_pj} onChange={(e) => setFormData({ ...formData, email_pj: e.target.value })} className={INPUT} />
                </div>
                <div>
                  <Rotulo htmlFor="pf-resp">Responsável técnico</Rotulo>
                  <input id="pf-resp" required type="text" value={formData.resp_tec} onChange={(e) => setFormData({ ...formData, resp_tec: e.target.value })} className={INPUT} />
                </div>
                <div>
                  <Rotulo htmlFor="pf-tel">Telefone</Rotulo>
                  <input id="pf-tel" required type="text" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} className={INPUT} />
                </div>
                <div>
                  <Rotulo htmlFor="pf-cep">CEP</Rotulo>
                  <input
                    id="pf-cep"
                    required
                    type="text"
                    inputMode="numeric"
                    maxLength={9}
                    value={formData.cep}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "")
                      if (val.length > 5) val = val.substring(0, 5) + "-" + val.substring(5, 8)
                      setFormData({ ...formData, cep: val })
                      if (val.length === 9) fetchAddressByCep(val)
                    }}
                    className={INPUT}
                  />
                </div>
                <div className="sm:col-span-2 grid grid-cols-[1fr_7rem] gap-4">
                  <div>
                    <Rotulo htmlFor="pf-logr">Logradouro</Rotulo>
                    <input id="pf-logr" required type="text" readOnly value={formData.logradouro} className={INPUT_LEITURA} />
                  </div>
                  <div>
                    <Rotulo htmlFor="pf-num">Número</Rotulo>
                    <input id="pf-num" required type="text" value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} className={INPUT} />
                  </div>
                </div>
                <div>
                  <Rotulo htmlFor="pf-bairro">Bairro</Rotulo>
                  <input id="pf-bairro" required type="text" readOnly value={formData.bairro} className={INPUT_LEITURA} />
                </div>
                <div className="grid grid-cols-[1fr_4.5rem] gap-4">
                  <div>
                    <Rotulo htmlFor="pf-cidade">Cidade</Rotulo>
                    <input id="pf-cidade" required type="text" readOnly value={formData.cidade} className={INPUT_LEITURA} />
                  </div>
                  <div>
                    <Rotulo htmlFor="pf-uf">UF</Rotulo>
                    <input id="pf-uf" required type="text" readOnly value={formData.estado} className={`${INPUT_LEITURA} uppercase`} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500">Logradouro, bairro, cidade e UF são preenchidos a partir do CEP.</p>
            </div>

            {erro && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Salvar alterações
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
