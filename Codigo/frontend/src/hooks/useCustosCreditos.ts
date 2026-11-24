"use client"

import { useEffect, useState } from "react"
import servicesGetCreditosCustos from "@/server/(GET)-creditos-custos"

/**
 * Custo, em créditos, de cada funcionalidade paga.
 * A fonte é o backend (GET /creditos/custos/); o valor fica em cache
 * durante a sessão. Enquanto carrega, os custos são null.
 */
export type CustosCreditos = {
  publicacao: number | null
  ia: number | null
  precoReferencia: number | null
  analiseEstoque: number | null
}

const VAZIO: CustosCreditos = { publicacao: null, ia: null, precoReferencia: null, analiseEstoque: null }

let cache: CustosCreditos | null = null
let pendente: Promise<CustosCreditos> | null = null

function carregarCustos(): Promise<CustosCreditos> {
  if (cache) return Promise.resolve(cache)
  if (!pendente) {
    pendente = servicesGetCreditosCustos().then((resposta) => {
      pendente = null
      if ("isError" in resposta) return VAZIO
      const custo = (codigo: string) => resposta.find((c) => c.codigo === codigo)?.custo ?? null
      cache = {
        publicacao: custo("PUBLICAR_ANUNCIO"),
        ia: custo("IA_DESCRICAO"),
        precoReferencia: custo("PRECO_REFERENCIA"),
        analiseEstoque: custo("IA_ANALISE_ESTOQUE"),
      }
      return cache
    })
  }
  return pendente
}

export function useCustosCreditos(): CustosCreditos {
  const [custos, setCustos] = useState<CustosCreditos>(cache ?? VAZIO)

  useEffect(() => {
    let ativo = true
    carregarCustos().then((valor) => {
      if (ativo) setCustos(valor)
    })
    return () => {
      ativo = false
    }
  }, [])

  return custos
}

/** "5 créditos", "1 crédito" ou "… créditos" enquanto carrega. */
export function rotuloCreditos(quantidade: number | null): string {
  if (quantidade === null) return "… créditos"
  return `${quantidade.toLocaleString("pt-BR")} ${quantidade === 1 ? "crédito" : "créditos"}`
}
