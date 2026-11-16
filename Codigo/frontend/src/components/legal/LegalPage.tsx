import Link from "next/link"
import Footer from "@/components/ui/Footer"

export type SecaoLegal = { id: string; titulo: string; conteudo: React.ReactNode }

/** Página de texto legal (Termos de Uso, Política de Privacidade). */
export default function LegalPage({
  titulo,
  resumo,
  atualizadoEm,
  secoes,
}: {
  titulo: string
  resumo: string
  atualizadoEm: string
  secoes: SecaoLegal[]
}) {
  return (
    <>
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 lg:py-16 grid lg:grid-cols-[14rem_minmax(0,1fr)] gap-10 lg:gap-16">
          {/* Sumário */}
          <nav aria-label="Sumário" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Nesta página</p>
              <ol className="space-y-2 text-sm">
                {secoes.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-slate-600 hover:text-blue-700 transition-colors">
                      {i + 1}. {s.titulo}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <article className="min-w-0 max-w-3xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">{titulo}</h1>
            <p className="mt-3 text-lg text-slate-600 leading-relaxed">{resumo}</p>
            <p className="mt-3 text-sm text-slate-500">Última atualização: {atualizadoEm}</p>

            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong>Versão preliminar.</strong> Este texto descreve o funcionamento atual da plataforma e deve
              passar por revisão jurídica antes da operação comercial.
            </div>

            <div className="mt-10 space-y-10">
              {secoes.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {i + 1}. {s.titulo}
                  </h2>
                  <div className="mt-3 space-y-3 text-[15px] text-slate-700 leading-7 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-blue-700 [&_a]:underline [&_a]:underline-offset-2">
                    {s.conteudo}
                  </div>
                </section>
              ))}
            </div>

            <p className="mt-12 pt-6 border-t border-slate-200 text-sm text-slate-500">
              Veja também:{" "}
              {titulo.startsWith("Termos")
                ? <Link href="/privacidade" className="text-blue-700 underline underline-offset-2">Política de Privacidade</Link>
                : <Link href="/termos" className="text-blue-700 underline underline-offset-2">Termos de Uso</Link>}
            </p>
          </article>
        </div>
      </div>
      <Footer />
    </>
  )
}
