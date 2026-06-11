import React from "react"
import Link from "next/link"

export default function Footer() {
  return (
    <footer className="w-full bg-sky-950 text-zinc-300 py-10 px-6 md:px-10 dark:bg-zinc-950 border-t border-white/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="flex flex-col gap-2">
          <h2 className="font-extrabold text-xl text-white tracking-wider">MedConnect</h2>
          <p className="text-zinc-400">
            Conectando quem possui excedentes hospitalares a quem precisa deles, facilitando negociações e transformando recursos ociosos em soluções para toda a rede de saúde.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-white mb-1">Navegação</h3>
          <Link href="/#sobre" className="hover:text-white transition-colors">Sobre Nós</Link>
          <Link href="/#como-funciona" className="hover:text-white transition-colors">Como Funciona</Link>
          <Link href="/#planos" className="hover:text-white transition-colors">Planos</Link>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-white mb-1">Legal</h3>
          <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
          <Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/10 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} MedConnect. Todos os direitos reservados.
      </div>
    </footer>
  )
}