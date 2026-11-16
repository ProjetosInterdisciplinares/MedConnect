import React from "react"
import Link from "next/link"

const FOOTER_LEGAL = [
  { name: "Termos de Uso", href: "/termos" },
  { name: "Política de Privacidade", href: "/privacidade" },
]

/** Rodapé compacto do site público: marca, links legais e direitos em uma linha. */
export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200 px-6 md:px-10 py-5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Marca */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 w-fit shrink-0" aria-label="MedConnect, página inicial">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-700">
              <img src="/med-icon.svg" alt="" className="w-5 h-5 invert" />
            </span>
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              Med<span className="text-blue-700">Connect</span>
            </span>
          </Link>
          <span className="hidden sm:block w-px h-5 bg-slate-200" aria-hidden="true" />
          <p className="text-sm text-slate-500">
            Conectando quem possui excedentes hospitalares a quem precisa deles.
          </p>
        </div>

        {/* Legal e direitos */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          {FOOTER_LEGAL.map((link) => (
            <Link key={link.href} href={link.href} className="text-slate-600 hover:text-blue-700 transition-colors">
              {link.name}
            </Link>
          ))}
          <span className="text-slate-400">© {new Date().getFullYear()} MedConnect</span>
        </div>
      </div>
    </footer>
  )
}
