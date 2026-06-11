"use client"

import React, { ReactNode, useEffect, useState } from "react"
import servicesGetMinhaPessoaJuridica from "@/server/(GET)-minha-pessoa-juridica"
import { PessoaJuridica } from "@/types"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { 
  LogOut, 
  Store, 
  FileText, 
  SquarePlus,
  ChevronDown, 
  Inbox,
  Menu,
  X
} from "lucide-react"
import Footer from "@/components/ui/Footer"
import { ModeToggle } from "@/components/ui/toggle-theme"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Array de links para manter o código limpo (DRY)
const NAV_LINKS = [
  { name: "Catálogo", href: "/catalogo", icon: Store },
  { name: "Cadastro", href: "/cadastrar", icon: FileText },
  { name: "Publicar Anúncio", href: "/anunciar", icon: SquarePlus },
  { name: "Caixa de propostas", href: "/caixa-de-propostas", icon: Inbox },
]

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [empresa, setEmpresa] = useState<PessoaJuridica | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Verifica autenticação e carrega a empresa
  useEffect(() => {
    const isAuthenticated = !!localStorage.getItem("token")

    if (!isAuthenticated) {
      router.push("/auth")
      return
    }

    async function carregarEmpresa() {
      const result = await servicesGetMinhaPessoaJuridica()

      if (
        result &&
        typeof result === "object" &&
        !("isError" in result)
      ) {
        setEmpresa(result)
      }
    }

    carregarEmpresa()
  }, [router])

  // Fecha o menu mobile automaticamente ao trocar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-zinc-50 text-zinc-900 font-sans antialiased selection:bg-cyan-500/20 dark:bg-black dark:text-zinc-100">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b w-full h-16 flex items-center justify-between bg-sky-950 shadow-md shadow-zinc-950/5 px-4 md:px-7 dark:bg-zinc-950">

        {/* LOGO */}
        <div className="flex items-center z-50">
          <img src="../med-icon.svg" alt="MedConnect Logo" className="w-6 h-6 mr-2 ml-0 filter invert" />
          <Link href="/catalogo" className="font-extrabold text-xl text-white tracking-wider hover:opacity-95 transition-opacity">
            MedConnect
          </Link>
        </div>

        {/* MENU PRINCIPAL (DESKTOP) - Removido o absolute, adicionado flex-1 e justify-center */}
        <div className="hidden lg:flex flex-1 justify-center items-center gap-1 xl:gap-2 mx-4">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-full transition-all duration-200 font-semibold text-sm select-none group whitespace-nowrap
                  ${isActive 
                    ? "bg-white/10 text-white shadow-inner shadow-white/5" 
                    : "text-zinc-400 hover:text-white hover:bg-white/10"
                  }
                `}
              >
                <Icon 
                  size={16} 
                  className={`transition-colors duration-200 ${isActive ? "text-white" : "text-zinc-400 group-hover:text-white"}`} 
                />
                {link.name}
              </Link>
            )
          })}
        </div>

        {/* AÇÕES DIREITA */}
        <div className="flex items-center gap-3 z-50">
          
          {/* USER MENU */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 focus:outline-none pl-1.5 pr-2 lg:pr-4 py-1.5 rounded-full transition-all text-white border border-transparent hover:border-white/10 active:scale-[0.98] cursor-pointer outline-none ring-0">
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-xs lg:text-sm tracking-wider shadow-inner">
                {empresa?.nm_pessoaj?.substring(0, 2).toUpperCase() ?? "PJ"}
              </div>
              <span className="hidden lg:block text-sm font-semibold tracking-wide max-w-30 truncate">
                {empresa?.nm_pessoaj ?? "Perfil"}
              </span>
              <ChevronDown size={14} className="text-zinc-300 transition-transform duration-300" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-xl shadow-xl border border-zinc-200/80 dark:border-zinc-800 py-1.5 z-50">
              <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <p className="text-sm font-bold truncate">Minha Conta</p>
                <p className="text-xs text-zinc-400 font-medium truncate mt-0.5">Configurações do Perfil</p>
              </div>
              
              <DropdownMenuGroup>
                <DropdownMenuItem  className="px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer focus:bg-zinc-50 dark:focus:bg-zinc-800">
                  <Link href="/perfil" className="w-full">Perfil</Link>
                </DropdownMenuItem>
               
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="border-t border-zinc-100 dark:border-zinc-800 my-1" />

              <DropdownMenuItem
                className="flex items-center gap-2 px-4 py-2.5 mt-1.5 text-sm font-bold text-red-600 text-left transition-colors cursor-pointer focus:text-slate-800 focus:bg-red-100"
                onClick={() => {
                  localStorage.removeItem("token")
                  localStorage.removeItem("cnpj")
                  router.push("/auth")
                }}
              >
                <LogOut size={16} className="text-red-600" />
                Sair do Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* BOTÃO HAMBÚRGUER (MOBILE & TABLET) */}
          <button 
            className="hover:cursor-pointer lg:hidden flex items-center justify-center p-2 text-zinc-300 hover:text-white transition-colors focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Abrir menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* MENU PRINCIPAL (MOBILE & TABLET) */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-sky-950 border-b border-white/10 shadow-xl flex flex-col p-4 gap-2 lg:hidden z-40 animate-in slide-in-from-top-2">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 font-semibold text-sm group
                    ${isActive 
                      ? "bg-white/10 text-white shadow-inner shadow-white/5" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <Icon 
                    size={18} 
                    className={`transition-colors duration-200 ${isActive ? "text-white" : "text-zinc-400 group-hover:text-white"}`} 
                  />
                  {link.name}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* CONTEÚDO DA PÁGINA */}
      <main className="w-full flex-1 p-4 md:p-8 max-w-7xl">
        {children}
      </main>
<Footer/>
    
    </div>
  )
}