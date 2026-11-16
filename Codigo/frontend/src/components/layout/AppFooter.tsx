import Link from "next/link"

/** Rodapé compacto das telas logadas: apenas os links legais. */
export default function AppFooter() {
  return (
    <footer className="w-full border-t border-slate-200 px-4 sm:px-6 lg:px-8 py-4 flex justify-center sm:justify-end text-xs text-slate-500">
      <nav aria-label="Links legais" className="flex gap-4">
        <Link href="/termos" className="hover:text-slate-800 transition-colors">Termos de Uso</Link>
        <Link href="/privacidade" className="hover:text-slate-800 transition-colors">Política de Privacidade</Link>
      </nav>
    </footer>
  )
}
