"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Info, HelpCircle, CreditCard } from "lucide-react"

const NAV_LINKS = [
  { name: "Sobre Nós", href: "/#sobre", icon: Info },
  { name: "Como Funciona", href: "/#como-funciona", icon: HelpCircle },
  { name: "Planos", href: "/#planos", icon: CreditCard },
]

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === "/auth"

  return (
    <div className="w-full min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100 scroll-smooth">
      {/* NAVBAR */}
    <nav className="w-full h-16 flex items-center justify-between bg-sky-950 px-6 md:px-7 sticky top-0 z-50 border-b border-white/10">
  
  {/* LOGO */}
 <div className="flex items-center z-50">
          <img src="../med-icon.svg" alt="MedConnect Logo" className="w-6 h-6 mr-2 ml-0 filter invert" />
          <Link href="../" className="font-extrabold text-xl text-white tracking-wider hover:opacity-95 transition-opacity">
            MedConnect
          </Link>
        </div>
  {/* MENU RÁPIDO */}
  <div className="hidden md:flex items-center gap-1">
    {NAV_LINKS.map((link) => (
      <Link
        key={link.href}
        href={link.href}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-all"
      >
        <link.icon size={16} />
        {link.name}
      </Link>
    ))}
  </div>

  {/* AÇÕES - ALTERAÇÃO AQUI: Não usamos mais a condicional para remover do DOM */}
  <div className={`flex gap-3 ${isAuthPage ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
    <Link href="/auth" className="text-sm font-semibold text-zinc-300 hover:text-white px-3 py-2.5 rounded-full hover:bg-white/10">
        Entrar
    </Link>
    <Link href="/auth" className="bg-sky-800 hover:bg-sky-900 text-white font-bold text-sm px-4 py-2.5 rounded-full transition-all">
        Cadastre-se
    </Link>
  </div>
</nav>

      <main>{children}</main>
    </div>
  )
}