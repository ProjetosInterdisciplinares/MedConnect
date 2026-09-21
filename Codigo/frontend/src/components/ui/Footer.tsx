import React from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

const FOOTER_NAV = [
  { name: "Sobre Nós", href: "/#sobre" },
  { name: "Como Funciona", href: "/#como-funciona" },
  { name: "Planos", href: "/#planos" },
]

const FOOTER_LEGAL = [
  { name: "Termos de Uso", href: "/termos" },
  { name: "Política de Privacidade", href: "/privacidade" },
]

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden">
      {/* Top gradient divider */}
      <div
        className="w-full h-px"
        style={{ background: "linear-gradient(to right, transparent, rgba(59,130,246,0.3), transparent)" }}
      />

      <div
        className="py-16 px-6 md:px-10"
        style={{ background: "linear-gradient(180deg, #172554, #080f24)" }}
      >
        {/* Radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
          style={{ background: "rgba(59,130,246,0.04)", filter: "blur(60px)" }}
        />

        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
            {/* Brand */}
            <div className="md:col-span-5 flex flex-col gap-5">
              <Link href="/" className="flex items-center gap-3 group w-fit">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    boxShadow: "0 4px 14px rgba(59,130,246,0.2)",
                  }}
                >
                  <span className="text-white font-black text-lg">M</span>
                </div>
                <span className="font-extrabold text-2xl text-white tracking-wider">
                  Med<span style={{ color: "#60a5fa" }}>Connect</span>
                </span>
              </Link>
              <p className="text-zinc-400 leading-relaxed text-sm max-w-md">
                Conectando quem possui excedentes hospitalares a quem precisa
                deles, facilitando negociações e transformando recursos ociosos
                em soluções para toda a rede de saúde.
              </p>
              {/* Social proof */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex -space-x-2">
                  {[
                    { bg: "#3b82f6", label: "MC" },
                    { bg: "#2563eb", label: "HS" },
                    { bg: "#1d4ed8", label: "UF" },
                    { bg: "#1e40af", label: "SP" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: item.bg,
                        border: "2px solid #172554",
                      }}
                    >
                      <span className="text-white text-[10px] font-bold">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-zinc-500">
                  +500 empresas já utilizam
                </span>
              </div>
            </div>

            {/* Nav */}
            <div className="md:col-span-3 md:col-start-7">
              <h3
                className="text-xs font-bold mb-5 uppercase tracking-[0.2em]"
                style={{ color: "#60a5fa" }}
              >
                Navegação
              </h3>
              <ul className="flex flex-col gap-3">
                {FOOTER_NAV.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-all duration-300 w-fit"
                    >
                      <span
                        className="w-0 group-hover:w-3 h-px transition-all duration-300"
                        style={{ backgroundColor: "#60a5fa" }}
                      />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div className="md:col-span-3">
              <h3
                className="text-xs font-bold mb-5 uppercase tracking-[0.2em]"
                style={{ color: "#60a5fa" }}
              >
                Legal
              </h3>
              <ul className="flex flex-col gap-3">
                {FOOTER_LEGAL.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-all duration-300 w-fit"
                    >
                      <span
                        className="w-0 group-hover:w-3 h-px transition-all duration-300"
                        style={{ backgroundColor: "#60a5fa" }}
                      />
                      {link.name}
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-300"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-14 pt-6 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} MedConnect. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#34d399" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "#10b981" }} />
              </span>
              <span className="text-xs text-zinc-500">
                Todos os sistemas operacionais
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}