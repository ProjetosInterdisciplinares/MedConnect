"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Info, HelpCircle, CreditCard, Menu, X, ArrowRight, Shield } from "lucide-react"

const NAV_LINKS = [
  { name: "Sobre Nós", href: "/#sobre", icon: Info },
  { name: "Como Funciona", href: "/#como-funciona", icon: HelpCircle },
  { name: "Planos", href: "/#planos", icon: CreditCard },
]

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === "/auth"
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="w-full min-h-screen bg-white text-zinc-900 scroll-smooth">
      {/* ═══════════════ NAVBAR ═══════════════ */}
      <nav
        style={{
          height: scrolled ? "56px" : "64px",
          backgroundColor: scrolled ? "rgba(23, 37, 84, 0.95)" : "#172554",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          boxShadow: scrolled ? "0 4px 30px rgba(23, 37, 84, 0.25)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.08)",
          transition: "height 0.4s cubic-bezier(0.4,0,0.2,1), background-color 0.4s cubic-bezier(0.4,0,0.2,1), box-shadow 0.4s cubic-bezier(0.4,0,0.2,1), border-bottom 0.4s ease",
        }}
        className="w-full flex items-center justify-between px-6 md:px-10 sticky top-0 z-50"
      >
        {/* LOGO */}
        <Link href="../" className="flex items-center gap-2.5 group z-50">
          <div
            className="flex items-center justify-center rounded-xl shadow-lg group-hover:scale-105 transition-all duration-500"
            style={{
              width: scrolled ? "30px" : "34px",
              height: scrolled ? "30px" : "34px",
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              boxShadow: "0 4px 14px rgba(59, 130, 246, 0.25)",
              transition: "width 0.4s cubic-bezier(0.4,0,0.2,1), height 0.4s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <img
              src="../med-icon.svg"
              alt="MedConnect Logo"
              className="w-5 h-5 filter invert"
            />
          </div>
          <span className="font-extrabold text-xl text-white tracking-wider group-hover:text-blue-200 transition-colors duration-300">
            Med<span className="text-blue-400">Connect</span>
          </span>
        </Link>

        {/* NAV LINKS (desktop) */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-blue-100/70 hover:text-white rounded-full transition-all duration-300 overflow-hidden"
            >
              <span className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/10 scale-75 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300" />
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 group-hover:w-6 h-0.5 bg-blue-400 rounded-full transition-all duration-300" />
              <link.icon size={15} className="relative z-10 group-hover:scale-110 group-hover:text-blue-300 transition-all duration-300" />
              <span className="relative z-10">{link.name}</span>
            </Link>
          ))}
        </div>

        {/* CTA BUTTONS (desktop) */}
        <div className={`hidden md:flex gap-3 items-center transition-all duration-300 ${isAuthPage ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <Link
            href="/auth"
            className="group text-sm font-semibold text-blue-100/70 hover:text-white px-4 py-2.5 rounded-full hover:bg-white/10 transition-all duration-300"
          >
            Entrar
          </Link>
          <Link
            href="/auth"
            className="group relative flex items-center gap-2 text-white font-bold text-sm px-6 py-2.5 rounded-full transition-all duration-300 hover:-translate-y-px overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              boxShadow: "0 4px 20px rgba(59, 130, 246, 0.3)",
            }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            <span className="relative">Cadastre-se</span>
            <ArrowRight size={14} className="relative group-hover:translate-x-0.5 transition-transform duration-300" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-2 hover:bg-white/10 rounded-xl transition-colors duration-300"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <div className="relative w-6 h-6">
            <Menu size={24} className={`absolute inset-0 transition-all duration-300 ${mobileMenuOpen ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"}`} />
            <X size={24} className={`absolute inset-0 transition-all duration-300 ${mobileMenuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"}`} />
          </div>
        </button>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={`md:hidden fixed inset-0 top-14 z-40 transition-all duration-400 ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ backgroundColor: "rgba(23, 37, 84, 0.98)", backdropFilter: "blur(20px)" }}
      >
        <div className={`relative flex flex-col items-center gap-2 pt-8 px-6 transition-all duration-400 ${mobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}>
          {NAV_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 w-full px-6 py-4 text-base font-semibold text-zinc-200 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <link.icon size={20} className="text-blue-400" />
              {link.name}
            </Link>
          ))}
          {!isAuthPage && (
            <div className="flex flex-col gap-3 w-full mt-6 pt-6 border-t border-white/10">
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-base font-semibold text-zinc-200 hover:text-white px-6 py-3 rounded-xl hover:bg-white/10 transition-all duration-300"
              >
                Entrar
              </Link>
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-white font-bold text-base px-6 py-3.5 rounded-xl transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  boxShadow: "0 4px 20px rgba(59, 130, 246, 0.3)",
                }}
              >
                Cadastre-se
              </Link>
            </div>
          )}
        </div>
      </div>

      <main>{children}</main>
    </div>
  )
}