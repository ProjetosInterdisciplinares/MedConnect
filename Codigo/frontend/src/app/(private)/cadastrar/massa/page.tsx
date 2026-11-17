"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Endereço antigo do cadastro em massa: agora fica em Anúncios. */
export default function CadastroMassaRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/anunciar-em-massa")
  }, [router])
  return null
}
