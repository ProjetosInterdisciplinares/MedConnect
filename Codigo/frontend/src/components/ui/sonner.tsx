"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheck, Info, TriangleAlert, CircleAlert, Loader2 } from "lucide-react"

/**
 * Notificações padronizadas: cartão branco neutro, texto escuro e apenas o
 * ícone indica o tipo (sem fundos verdes/vermelhos).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      gap={10}
      duration={4000}
      icons={{
        success: <CircleCheck className="size-[18px] text-blue-700" strokeWidth={2.25} />,
        info: <Info className="size-[18px] text-slate-500" strokeWidth={2.25} />,
        warning: <TriangleAlert className="size-[18px] text-amber-600" strokeWidth={2.25} />,
        error: <CircleAlert className="size-[18px] text-red-600" strokeWidth={2.25} />,
        loading: <Loader2 className="size-[18px] text-slate-500 animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "w-[356px] max-w-[calc(100vw-32px)] flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.18)] font-sans",
          icon: "mt-0.5 shrink-0",
          content: "flex-1 min-w-0",
          title: "text-sm font-semibold text-slate-900 leading-5",
          description: "mt-0.5 text-[13px] text-slate-600 leading-5",
          actionButton: "ml-2 shrink-0 rounded-md bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-800",
          cancelButton: "ml-2 shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
