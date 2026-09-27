"use client"

import { useState, useRef } from "react"
import { PessoaJuridica } from "@/types"
import { Edit, Mail, MapPin, Phone, Camera, Loader2, CheckCircle } from "lucide-react"
import servicesUpdatePessoaJuridica from "@/server/(PUT)-pessoa-juridica"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface Props {
  empresa: PessoaJuridica | null
}

export default function PerfilHeader({ empresa }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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
    if (cep.length !== 9) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep.replace("-", "")}/json/`);
      const data = await res.json();
      if (data.erro) return;

      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro || "",
        bairro: data.bairro || "",
        cidade: data.localidade || "",
        estado: data.uf || "",
      }));

      // Buscar coordenadas
      const addressString = `${data.logradouro || ""}, ${data.localidade || ""}, ${data.uf || ""}, Brazil`;
      const coordRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}`
      );
      const coordData = await coordRes.json();
      if (coordData && coordData.length > 0) {
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(coordData[0].lat),
          longitude: parseFloat(coordData[0].lon),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setFormData((prev) => ({
        ...prev,
        imagem_perfil: event.target?.result as string,
      }))
    }
    reader.readAsDataURL(file)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!empresa) return

    setIsSaving(true)
    const res = await servicesUpdatePessoaJuridica(empresa.cd_pessoaj, formData)
    setIsSaving(false)

    if ("isError" in res && res.isError) {
      alert(res.message)
      return
    }

    // Refresh da página para atualizar os dados globalmente
    window.location.reload()
  }

  return (
    <>
      <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm mb-8 relative overflow-hidden">
        {/* Decorative gradient top bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-blue-400" />

        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full text-center sm:text-left">
            {/* Foto de Perfil */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 bg-blue-50 rounded-full flex items-center justify-center border-[3px] border-blue-100 overflow-hidden shadow-sm">
                {empresa?.imagem_perfil ? (
                  <img src={empresa.imagem_perfil} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-3xl text-blue-700">
                    {empresa?.nm_pessoaj?.substring(0, 2).toUpperCase() ?? "PJ"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 mt-1">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                {empresa?.razao_social ?? "Carregando..."}
              </h1>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 bg-sky-50 text-sky-700 text-[11px] font-bold uppercase tracking-wider rounded-full border border-sky-200">
                <CheckCircle className="w-3 h-3" /> Empresa Verificada
              </span>

              <div className="mt-5 space-y-2.5 text-sm text-slate-600 font-medium">
                <p className="flex items-center justify-center sm:justify-start gap-2.5">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  {empresa?.email_pj}
                </p>

                <p className="flex items-center justify-center sm:justify-start gap-2.5">
                  <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                  Responsável: <span className="font-bold text-slate-800">{empresa?.resp_tec}</span>
                </p>

                <p className="flex items-center justify-center sm:justify-start gap-2.5">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                  CNPJ: <span className="font-bold text-slate-800">{empresa?.nr_cnpj}</span>
                </p>

                <p className="flex items-center justify-center sm:justify-start gap-2.5">
                  <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                  Telefone: <span className="font-bold text-slate-800">{empresa?.telefone || "Não informado"}</span>
                </p>

                <p className="flex items-center justify-center sm:justify-start gap-2.5">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                  Endereço: <span className="font-bold text-slate-800">
                    {empresa?.cep
                      ? `${empresa.logradouro || ""}, ${empresa.numero || ""} - ${empresa.bairro || ""}, ${empresa.cidade || ""}/${empresa.estado || ""} (CEP: ${empresa.cep})`
                      : "Não informado"
                    }
                  </span>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenEdit}
            className="w-full md:w-auto flex items-center justify-center gap-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
          >
            <Edit className="w-4 h-4" />
            Editar Perfil
          </button>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-xl text-blue-800 flex items-center gap-2">
                <Edit className="w-5 h-5" /> Editar Informações
              </DialogTitle>
              <DialogDescription>
                Atualize as informações de contato e a imagem da sua instituição.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-5">
              {/* Image Upload Area */}
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 group-hover:border-blue-500 transition-colors">
                    {formData.imagem_perfil ? (
                      <img src={formData.imagem_perfil} alt="Preview" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                    ) : (
                      <Camera className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold">Alterar</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium">Clique para selecionar uma nova foto</p>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">Razão Social</label>
                  <input
                    required
                    type="text"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">E-mail de Contato</label>
                  <input
                    required
                    type="email"
                    value={formData.email_pj}
                    onChange={(e) => setFormData({ ...formData, email_pj: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">Responsável Técnico</label>
                  <input
                    required
                    type="text"
                    value={formData.resp_tec}
                    onChange={(e) => setFormData({ ...formData, resp_tec: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-sm font-bold text-slate-700">Telefone</label>
                    <input
                      required
                      type="text"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-sm font-bold text-slate-700">CEP</label>
                    <input
                      required
                      type="text"
                      maxLength={9}
                      value={formData.cep}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length > 5) val = val.substring(0, 5) + "-" + val.substring(5, 8);
                        setFormData({ ...formData, cep: val });
                        if (val.length === 9) fetchAddressByCep(val);
                      }}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-sm font-bold text-slate-700">Logradouro</label>
                    <input
                      required
                      type="text"
                      readOnly
                      value={formData.logradouro}
                      className="w-full px-4 py-2.5 bg-gray-100 border border-slate-200 rounded-xl outline-none text-sm shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-sm font-bold text-slate-700">Número</label>
                    <input
                      required
                      type="text"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-sm font-bold text-slate-700">Bairro</label>
                    <input
                      required
                      type="text"
                      readOnly
                      value={formData.bairro}
                      className="w-full px-4 py-2.5 bg-gray-100 border border-slate-200 rounded-xl outline-none text-sm shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-sm font-bold text-slate-700">Cidade</label>
                    <input
                      required
                      type="text"
                      readOnly
                      value={formData.cidade}
                      className="w-full px-4 py-2.5 bg-gray-100 border border-slate-200 rounded-xl outline-none text-sm shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-sm font-bold text-slate-700">UF</label>
                    <input
                      required
                      type="text"
                      readOnly
                      value={formData.estado}
                      className="w-full px-4 py-2.5 bg-gray-100 border border-slate-200 rounded-xl outline-none text-sm shadow-inner uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-md disabled:opacity-70"
                style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Salvar Alterações
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}