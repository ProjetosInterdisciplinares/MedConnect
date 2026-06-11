"use client"

import { PessoaJuridica } from "@/types"
import { Edit, Mail, MapPin, Phone } from "lucide-react"

interface Props {
  empresa: PessoaJuridica | null
}

export default function PerfilHeader({ empresa }: Props) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8">
      <div className="flex items-start justify-between">
        <div className="flex gap-6">
          <div className="w-24 h-24 bg-sky-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center font-bold text-2xl text-sky-950 dark:text-sky-400">
            {empresa?.nm_pessoaj?.substring(0, 2).toUpperCase() ?? "PJ"}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {empresa?.razao_social ?? "Carregando..."}
            </h1>

            <span className="inline-block px-2 py-0.5 mt-1 bg-green-50 text-green-700 text-xs font-semibold rounded-md border border-green-200">
              Empresa Verificada
            </span>

            <div className="mt-4 space-y-1 text-sm text-zinc-500">
              <p className="flex items-center gap-2">
                <Mail size={14} />
                {empresa?.email_pj}
              </p>

              <p className="flex items-center gap-2">
                <Phone size={14} />
                Responsável: {empresa?.resp_tec}
              </p>

              <p className="flex items-center gap-2">
                <MapPin size={14} />
                CNPJ: {empresa?.nr_cnpj}
              </p>
            </div>
          </div>
        </div>

        <button className="flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-sky-950 transition-colors">
          <Edit size={16} />
          Editar
        </button>
      </div>
    </div>
  )
}