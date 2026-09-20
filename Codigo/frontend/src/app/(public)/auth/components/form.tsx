"use client"

import React, { JSX, useState, useTransition } from "react"
import {
  Field,
  FieldError,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { authSchema, resetPasswordSchema } from "../schema"
import { formatCNPJ } from "@/lib/format/format-document"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { z } from "zod"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import servicesAuth from "@/server/(POST)-auth"
import servicesPasswordReset from "@/server/(POST)-password-reset"
import {
  ArrowRight,
  Building2,
  FileText,
  CreditCard,
  Mail,
  UserCog,
  Lock,
  Eye,
  EyeOff,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { registerSchema } from "../schema"
import servicesRegister from "@/server/(POST)-register"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import AnimatedBackground from "@/components/ui/animated-background"


/* ─── Password strength checker ─────────────────────────────── */
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: "Muito fraca", color: "#ef4444" }
  if (score === 2) return { score, label: "Fraca", color: "#f97316" }
  if (score === 3) return { score, label: "Média", color: "#eab308" }
  if (score === 4) return { score, label: "Forte", color: "#22c55e" }
  return { score, label: "Muito forte", color: "#059669" }
}

/* ─── Required label component ─────────────────────────────── */
function RequiredLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium text-gray-700 flex items-center gap-1"
    >
      {children}
      <span className="text-red-500 text-xs" aria-hidden="true">*</span>
    </label>
  )
}


export default function Form(): JSX.Element {
  const router = useRouter()
  const [isSubmit, startSubmit] = useTransition()
  const [isRightPanelActive, setIsRightPanelActive] = useState(false)
  const [isForgotPasswordPanelActive, setIsForgotPasswordPanelActive] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showResetNewPassword, setShowResetNewPassword] = useState(false)
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      cnpj: "",
      password: ""
    },
  })

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      nm_pessoaj: "",
      razao_social: "",
      nr_cnpj: "",
      email_pj: "",
      resp_tec: "",
      senha_pj: ""
    },
  })

  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: {
      cnpj: "",
      email: "",
      new_password: "",
      confirm_password: ""
    }
  })

  const watchPassword = registerForm.watch("senha_pj")
  const passwordStrength = getPasswordStrength(watchPassword || "")

  const onSubmit = (data: z.infer<typeof authSchema>): void => {
    setLoginError(null)
    startSubmit(async () => {
      try {
        const response = await servicesAuth(data)

        if ("isError" in response) {
          const msg = response.status === 401
            ? "CNPJ ou senha inválidos. Verifique suas credenciais."
            : response.status === 403
              ? "Sua conta ainda está pendente de aprovação."
              : response.message || "Não foi possível autenticar."
          setLoginError(msg)
          toast.error("Erro ao entrar", { description: msg })
          return
        }

        localStorage.setItem("token", response.access)
        localStorage.setItem("cnpj", response.cnpj)
        localStorage.setItem("userId", String(response.id))
        toast.success("Login realizado com sucesso!")
        router.push("/catalogo")
      } catch {
        const msg = "Erro de conexão com o servidor. Tente novamente."
        setLoginError(msg)
        toast.error("Erro de conexão", { description: msg })
      }
    })
  }

  const onRegister = (data: z.infer<typeof registerSchema>): void => {
    startSubmit(async () => {
      try {
        const payload = {
          ...data,
          nr_cnpj: data.nr_cnpj.replace(/\D/g, "")
        }
        const response = await servicesRegister(payload)

        if ("isError" in response) {
          const msg = response.message || "Não foi possível solicitar o cadastro."
          toast.error("Erro no cadastro", { description: msg })
          return
        }

        toast.success("Solicitação enviada!", {
          description: "Aguarde a aprovação do administrador para acessar sua conta."
        })

        registerForm.reset()
        setIsRightPanelActive(false)
      } catch {
        toast.error("Erro de conexão", {
          description: "Não foi possível conectar ao servidor. Tente novamente."
        })
      }
    })
  }

  const onSubmitResetPassword = (data: z.infer<typeof resetPasswordSchema>): void => {
    setResetError(null)
    startSubmit(async () => {
      try {
        const payload = {
          ...data,
          cnpj: data.cnpj.replace(/\D/g, "")
        }
        const response = await servicesPasswordReset(payload)

        if (response.status === "error") {
          const msg = response.message || "Erro ao redefinir a senha."
          setResetError(msg)
          toast.error("Erro na redefinição", { description: msg })
          return
        }

        toast.success("Senha atualizada!", {
          description: "Sua senha foi redefinida com sucesso. Faça login para acessar."
        })

        resetPasswordForm.reset()
        setIsForgotPasswordPanelActive(false)
      } catch {
        const msg = "Erro de conexão com o servidor. Tente novamente."
        setResetError(msg)
        toast.error("Erro de conexão", { description: msg })
      }
    })
  }

  return (
    <TooltipProvider>
      <div className="relative min-h-screen w-full flex items-start justify-center pt-16 md:pt-24 pb-0 font-sans text-gray-900 overflow-hidden">

        <AnimatedBackground />

        {/* container principal da animação */}
        <div className="relative overflow-hidden w-full max-w-[850px] h-[650px] max-h-[85vh] bg-white/85 backdrop-blur-md rounded-3xl z-10"
          style={{ boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.03)" }}
        >

          {/* ═══════════════ PAINEL DE CADASTRO ═══════════════ */}
          <div
            className={`absolute top-0 left-0 h-full w-full md:w-1/2 transition-all duration-700 ease-in-out
            ${isRightPanelActive
                ? 'md:translate-x-full opacity-100 z-50 pointer-events-auto'
                : 'opacity-0 z-10 pointer-events-none hidden md:block'}`}
          >
            <div className="flex flex-col items-center justify-start h-full px-8 py-6 text-center bg-white overflow-y-auto">
              <div className="w-full max-w-[340px]">
                <div className="mb-5">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
                    style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
                  >
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="font-bold text-2xl text-gray-900">Criar Conta</h1>
                  <p className="text-sm text-gray-500 mt-1">Preencha os dados para solicitar credenciamento</p>
                </div>

                <form
                  onSubmit={registerForm.handleSubmit(onRegister)}
                  className="w-full flex flex-col gap-2.5"
                  noValidate
                >
                  {/* Nome da Empresa */}
                  <div className="flex flex-col gap-1 text-left">
                    <RequiredLabel htmlFor="reg-nome">Nome da Empresa</RequiredLabel>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="reg-nome"
                        placeholder="Ex: MedTech Ltda"
                        className={`pl-10 h-10 bg-gray-50 border rounded-xl transition-all duration-200
                          ${registerForm.formState.errors.nm_pessoaj
                            ? "border-red-300 focus-visible:ring-red-400"
                            : "border-gray-200 focus-visible:ring-teal-500 hover:border-gray-300"}`}
                        {...registerForm.register("nm_pessoaj")}
                      />
                    </div>
                    {registerForm.formState.errors.nm_pessoaj && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {registerForm.formState.errors.nm_pessoaj.message}
                      </p>
                    )}
                  </div>

                  {/* Razão Social */}
                  <div className="flex flex-col gap-1 text-left">
                    <RequiredLabel htmlFor="reg-razao">Razão Social</RequiredLabel>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="reg-razao"
                        placeholder="Ex: MedTech Comércio Ltda"
                        className={`pl-10 h-10 bg-gray-50 border rounded-xl transition-all duration-200
                          ${registerForm.formState.errors.razao_social
                            ? "border-red-300 focus-visible:ring-red-400"
                            : "border-gray-200 focus-visible:ring-teal-500 hover:border-gray-300"}`}
                        {...registerForm.register("razao_social")}
                      />
                    </div>
                    {registerForm.formState.errors.razao_social && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {registerForm.formState.errors.razao_social.message}
                      </p>
                    )}
                  </div>

                  {/* CNPJ */}
                  <div className="flex flex-col gap-1 text-left">
                    <RequiredLabel htmlFor="reg-cnpj">CNPJ</RequiredLabel>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="reg-cnpj"
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        className={`pl-10 h-10 bg-gray-50 border rounded-xl transition-all duration-200
                          ${registerForm.formState.errors.nr_cnpj
                            ? "border-red-300 focus-visible:ring-red-400"
                            : "border-gray-200 focus-visible:ring-teal-500 hover:border-gray-300"}`}
                        {...registerForm.register("nr_cnpj", {
                          onChange: (e) => {
                            e.target.value = formatCNPJ(e.target.value)
                          }
                        })}
                      />
                    </div>
                    {registerForm.formState.errors.nr_cnpj && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {registerForm.formState.errors.nr_cnpj.message}
                      </p>
                    )}
                  </div>

                  {/* E-mail */}
                  <div className="flex flex-col gap-1 text-left">
                    <RequiredLabel htmlFor="reg-email">E-mail Corporativo</RequiredLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="contato@empresa.com.br"
                        className={`pl-10 h-10 bg-gray-50 border rounded-xl transition-all duration-200
                          ${registerForm.formState.errors.email_pj
                            ? "border-red-300 focus-visible:ring-red-400"
                            : "border-gray-200 focus-visible:ring-teal-500 hover:border-gray-300"}`}
                        {...registerForm.register("email_pj")}
                      />
                    </div>
                    {registerForm.formState.errors.email_pj && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {registerForm.formState.errors.email_pj.message}
                      </p>
                    )}
                  </div>

                  {/* Responsável Técnico */}
                  <div className="flex flex-col gap-1 text-left">
                    <RequiredLabel htmlFor="reg-resp">Responsável Técnico</RequiredLabel>
                    <div className="relative">
                      <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="reg-resp"
                        placeholder="Nome completo"
                        className={`pl-10 h-10 bg-gray-50 border rounded-xl transition-all duration-200
                          ${registerForm.formState.errors.resp_tec
                            ? "border-red-300 focus-visible:ring-red-400"
                            : "border-gray-200 focus-visible:ring-teal-500 hover:border-gray-300"}`}
                        {...registerForm.register("resp_tec")}
                      />
                    </div>
                    {registerForm.formState.errors.resp_tec && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {registerForm.formState.errors.resp_tec.message}
                      </p>
                    )}
                  </div>

                  {/* Senha com tooltip de requisitos */}
                  <div className="flex flex-col gap-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <RequiredLabel htmlFor="reg-senha">Senha</RequiredLabel>
                      <Tooltip>
                        <TooltipTrigger
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 hover:bg-teal-100 transition-colors cursor-help"
                          type="button"
                          aria-label="Requisitos de senha"
                        >
                          <HelpCircle className="w-3 h-3 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[260px] p-3 text-left">
                          <p className="font-semibold text-xs mb-1.5">Requisitos de senha segura:</p>
                          <ul className="text-xs space-y-1">
                            <li className="flex items-center gap-1.5">
                              {(watchPassword?.length || 0) >= 8
                                ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                                : <AlertCircle className="w-3 h-3 text-gray-400 shrink-0" />}
                              Mínimo 8 caracteres
                            </li>
                            <li className="flex items-center gap-1.5">
                              {/[A-Z]/.test(watchPassword || "")
                                ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                                : <AlertCircle className="w-3 h-3 text-gray-400 shrink-0" />}
                              1 letra maiúscula (A-Z)
                            </li>
                            <li className="flex items-center gap-1.5">
                              {/[a-z]/.test(watchPassword || "")
                                ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                                : <AlertCircle className="w-3 h-3 text-gray-400 shrink-0" />}
                              1 letra minúscula (a-z)
                            </li>
                            <li className="flex items-center gap-1.5">
                              {/[0-9]/.test(watchPassword || "")
                                ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                                : <AlertCircle className="w-3 h-3 text-gray-400 shrink-0" />}
                              1 número (0-9)
                            </li>
                            <li className="flex items-center gap-1.5">
                              {/[^A-Za-z0-9]/.test(watchPassword || "")
                                ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                                : <AlertCircle className="w-3 h-3 text-gray-400 shrink-0" />}
                              1 caractere especial (!@#$%...)
                            </li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="reg-senha"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Crie uma senha segura"
                        className={`pl-10 pr-10 h-10 bg-gray-50 border rounded-xl transition-all duration-200
                          ${registerForm.formState.errors.senha_pj
                            ? "border-red-300 focus-visible:ring-red-400"
                            : "border-gray-200 focus-visible:ring-teal-500 hover:border-gray-300"}`}
                        {...registerForm.register("senha_pj")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showRegisterPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password strength bar */}
                    {watchPassword && watchPassword.length > 0 && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${(passwordStrength.score / 5) * 100}%`,
                              backgroundColor: passwordStrength.color
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium shrink-0" style={{ color: passwordStrength.color }}>
                          {passwordStrength.label}
                        </span>
                      </div>
                    )}

                    {registerForm.formState.errors.senha_pj && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {registerForm.formState.errors.senha_pj.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmit}
                    className="rounded-xl text-white font-semibold text-sm py-2.5 h-11 mt-1 transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
                  >
                    {isSubmit ? (
                      <span className="flex items-center gap-2">Enviando... <Spinner className="w-4 h-4" /></span>
                    ) : (
                      <span className="flex items-center gap-2">Solicitar Credenciamento <ArrowRight className="w-4 h-4" /></span>
                    )}
                  </Button>

                  <p className="text-[11px] text-gray-400 mt-1">
                    Todos os campos marcados com <span className="text-red-500">*</span> são obrigatórios
                  </p>
                </form>

                <button
                  onClick={() => setIsRightPanelActive(false)}
                  className="md:hidden mt-4 text-sm text-teal-700 font-semibold hover:underline transition-colors"
                >
                  Já tem uma conta? Entrar
                </button>
              </div>
            </div>
          </div>

          {/* ═══════════════ PAINEL DE LOGIN ═══════════════ */}
          <div
            className={`absolute top-0 left-0 h-full w-full md:w-1/2 transition-all duration-700 ease-in-out z-20
            ${isRightPanelActive
                ? 'md:translate-x-full opacity-0 pointer-events-none hidden md:block'
                : 'opacity-100 pointer-events-auto'}`}
          >
            <div className="flex flex-col items-center justify-start h-full px-8 py-6 text-center bg-white overflow-y-auto">
              <div className="w-full max-w-[340px] my-auto">
                {!isForgotPasswordPanelActive ? (
                  <>
                    <div className="mb-5">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
                        style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
                      >
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="font-bold text-2xl text-gray-900">Bem-vindo</h1>
                      <p className="text-sm text-gray-500 mt-1">Acesse com suas credenciais corporativas</p>
                    </div>

                    {/* Login error banner */}
                    {loginError && (
                      <div className="flex items-start gap-2.5 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-left animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-700">{loginError}</p>
                      </div>
                    )}

                    <form
                      id="form-rhf-demo"
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="w-full flex flex-col gap-3.5"
                      noValidate
                    >
                      {/* CNPJ Login */}
                      <div className="flex flex-col gap-1 text-left">
                        <RequiredLabel htmlFor="cnpj-input">CNPJ</RequiredLabel>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="cnpj-input"
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                            disabled={isSubmit}
                            className={`w-full pl-10 h-10 bg-gray-50 border rounded-xl transition-all duration-200
                              ${form.formState.errors.cnpj
                                ? "border-red-300 focus-visible:ring-red-400"
                                : "border-gray-200 focus-visible:ring-teal-500 hover:border-gray-300"}`}
                            {...form.register("cnpj", {
                              onChange: (e) => {
                                e.target.value = formatCNPJ(e.target.value)
                                setLoginError(null)
                              }
                            })}
                          />
                        </div>
                        {form.formState.errors.cnpj && (
                          <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {form.formState.errors.cnpj.message}
                          </p>
                        )}
                      </div>

                      {/* Senha Login */}
                      <div className="flex flex-col gap-1 text-left">
                        <RequiredLabel htmlFor="password-input">Senha</RequiredLabel>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="password-input"
                            type={showLoginPassword ? "text" : "password"}
                            maxLength={20}
                            disabled={isSubmit}
                            placeholder="Sua senha corporativa"
                            autoComplete="current-password"
                            className={`w-full pl-10 pr-10 h-10 bg-gray-50 border rounded-xl transition-all duration-200
                              ${form.formState.errors.password
                                ? "border-red-300 focus-visible:ring-red-400"
                                : "border-gray-200 focus-visible:ring-teal-500 hover:border-gray-300"}`}
                            {...form.register("password", {
                              onChange: () => setLoginError(null)
                            })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {form.formState.errors.password && (
                          <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {form.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPasswordPanelActive(true)
                          setLoginError(null)
                          form.reset()
                        }}
                        className="text-sm text-gray-500 hover:text-teal-700 hover:underline transition-colors self-end -mt-1"
                      >
                        Esqueceu sua senha?
                      </button>

                      <Button
                        type="submit"
                        disabled={isSubmit}
                        className="w-full rounded-xl text-white font-semibold text-sm py-3.5 h-12 flex items-center justify-center transition-all duration-300 hover:shadow-lg active:scale-[0.98] mt-2"
                        style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)", boxShadow: "0 4px 15px rgba(13, 148, 136, 0.2)" }}
                      >
                        {isSubmit ? (
                          <span className="flex items-center gap-2">Entrando... <Spinner className="w-4 h-4" /></span>
                        ) : (
                          <span className="flex items-center gap-2">Entrar <ArrowRight className="w-4 h-4" /></span>
                        )}
                      </Button>
                    </form>

                    <button
                      onClick={() => setIsRightPanelActive(true)}
                      className="md:hidden mt-6 text-sm text-teal-700 font-semibold hover:underline transition-colors"
                    >
                      Não tem conta? Cadastre-se
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
                        style={{ background: "linear-gradient(135deg, #042f2e, #134e4a)" }}
                      >
                        <UserCog className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="font-bold text-2xl text-gray-900">Recuperar Senha</h1>
                      <p className="text-sm text-gray-500 mt-1">Informe os dados da empresa para redefinir o acesso.</p>
                    </div>

                    {/* Reset error banner */}
                    {resetError && (
                      <div className="flex items-start gap-2.5 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-left animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-700">{resetError}</p>
                      </div>
                    )}

                    <form
                      onSubmit={resetPasswordForm.handleSubmit(onSubmitResetPassword)}
                      className="w-full flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-3 duration-500"
                      noValidate
                    >
                      {/* CNPJ Reset */}
                      <div className="flex flex-col gap-1 text-left">
                        <RequiredLabel htmlFor="reset-cnpj">CNPJ</RequiredLabel>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="reset-cnpj"
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                            disabled={isSubmit}
                            className={`w-full pl-10 h-10 bg-gray-50 border rounded-xl transition-all duration-200
                              ${resetPasswordForm.formState.errors.cnpj ? "border-red-300 focus-visible:ring-red-400" : "border-gray-200 focus-visible:ring-teal-500 hover:border-gray-300"}`}
                            {...resetPasswordForm.register("cnpj", {
                              onChange: (e) => {
                                e.target.value = formatCNPJ(e.target.value)
                                setResetError(null)
                              }
                            })}
                          />
                        </div>
                        {resetPasswordForm.formState.errors.cnpj && (
                          <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5 text-left">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {resetPasswordForm.formState.errors.cnpj.message}
                          </p>
                        )}
                      </div>

                      {/* Email Reset */}
                      <div className="flex flex-col gap-1 text-left">
                        <RequiredLabel htmlFor="reset-email">E-mail Cadastrado</RequiredLabel>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="reset-email"
                            type="email"
                            disabled={isSubmit}
                            placeholder="exemplo@empresa.com"
                            className={`w-full pl-10 pr-4 bg-gray-50 border py-2.5 h-11 rounded-xl transition-all duration-200
                              ${resetPasswordForm.formState.errors.email ? "border-red-300 focus-visible:ring-red-400" : "border-gray-200 focus-visible:ring-teal-500"}`}
                            {...resetPasswordForm.register("email", {
                              onChange: () => setResetError(null)
                            })}
                          />
                        </div>
                        {resetPasswordForm.formState.errors.email && (
                          <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5 text-left">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {resetPasswordForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      {/* Nova Senha */}
                      <div className="flex flex-col gap-1 text-left">
                        <RequiredLabel htmlFor="reset-new-password">Nova Senha</RequiredLabel>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="reset-new-password"
                            type={showResetNewPassword ? "text" : "password"}
                            disabled={isSubmit}
                            placeholder="Digite a nova senha"
                            className={`w-full pl-10 pr-10 bg-gray-50 border py-2.5 h-11 rounded-xl transition-all duration-200
                              ${resetPasswordForm.formState.errors.new_password ? "border-red-300 focus-visible:ring-red-400" : "border-gray-200 focus-visible:ring-teal-500"}`}
                            {...resetPasswordForm.register("new_password", {
                              onChange: () => setResetError(null)
                            })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {resetPasswordForm.formState.errors.new_password && (
                          <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5 text-left">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {resetPasswordForm.formState.errors.new_password.message}
                          </p>
                        )}
                      </div>

                      {/* Confirmar Nova Senha */}
                      <div className="flex flex-col gap-1 text-left">
                        <RequiredLabel htmlFor="reset-confirm-password">Confirmar Nova Senha</RequiredLabel>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="reset-confirm-password"
                            type={showResetConfirmPassword ? "text" : "password"}
                            disabled={isSubmit}
                            placeholder="Repita a nova senha"
                            className={`w-full pl-10 pr-10 bg-gray-50 border py-2.5 h-11 rounded-xl transition-all duration-200
                              ${resetPasswordForm.formState.errors.confirm_password ? "border-red-300 focus-visible:ring-red-400" : "border-gray-200 focus-visible:ring-teal-500"}`}
                            {...resetPasswordForm.register("confirm_password", {
                              onChange: () => setResetError(null)
                            })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {resetPasswordForm.formState.errors.confirm_password && (
                          <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5 text-left">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {resetPasswordForm.formState.errors.confirm_password.message}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 mt-2">
                        <Button
                          type="submit"
                          disabled={isSubmit}
                          className="w-full rounded-xl text-white font-semibold text-sm py-3.5 h-12 flex items-center justify-center transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                          style={{ background: "linear-gradient(135deg, #042f2e, #134e4a)", boxShadow: "0 4px 15px rgba(4, 47, 46, 0.2)" }}
                        >
                          {isSubmit ? (
                            <span className="flex items-center gap-2">Redefinindo... <Spinner className="w-4 h-4" /></span>
                          ) : (
                            <span className="flex items-center gap-2">Confirmar <CheckCircle2 className="w-4 h-4" /></span>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isSubmit}
                          onClick={() => {
                            setIsForgotPasswordPanelActive(false)
                            resetPasswordForm.reset()
                            setResetError(null)
                          }}
                          className="text-sm font-semibold text-gray-500 hover:text-gray-800 py-2 transition-colors disabled:opacity-50"
                        >
                          Voltar para Login
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════ OVERLAY ANIMADO ═══════════════ */}
          <div
            className={`hidden md:block absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-transform duration-700 ease-in-out z-100
            ${isRightPanelActive ? '-translate-x-full' : 'translate-x-0 z-0'}`}
          >
            <div
              className={`relative -left-full h-full w-[200%] transition-transform duration-700 ease-in-out
              ${isRightPanelActive ? 'translate-x-1/2' : 'translate-x-0'}`}
              style={{ background: "linear-gradient(135deg, #0d9488, #0f766e, #115e59)" }}
            >
              {/* Decorative shapes */}
              <div className="absolute inset-0 overflow-hidden opacity-10">
                <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/20" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/15" />
                <div className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-white/10" />
              </div>

              {/* texto do lado esquerdo do overlay */}
              <div
                className={`absolute top-0 flex flex-col items-center justify-center px-12 text-center h-full w-1/2 transition-transform duration-700 ease-in-out
                ${isRightPanelActive ? 'translate-x-0' : 'translate-x-[-20%]'}`}
              >
                <h1 className="font-bold text-4xl mb-6 text-white leading-tight">Bem-vindo<br />de volta!</h1>
                <p className="text-sm font-light leading-relaxed tracking-wide mb-8 text-teal-100">
                  Para se manter conectado conosco, faça login com suas credenciais corporativas.
                </p>
                <Button
                  onClick={() => setIsRightPanelActive(false)}
                  variant="outline"
                  className="rounded-xl border-2 border-white/80 bg-transparent text-white hover:bg-white hover:text-teal-800 font-semibold text-sm py-3 px-10 h-11 transition-all duration-300 active:scale-95"
                >
                  Entrar
                </Button>
              </div>

              {/* texto do lado direito do overlay */}
              <div
                className={`absolute top-0 right-0 flex flex-col items-center justify-center px-12 text-center h-full w-1/2 transition-transform duration-700 ease-in-out
                ${isRightPanelActive ? 'translate-x-[20%]' : 'translate-x-0'}`}
              >
                <h1 className="font-bold text-4xl mb-6 text-white leading-tight">Olá,<br />Parceiro!</h1>
                <p className="text-sm font-light leading-relaxed tracking-wide mb-8 text-teal-100">
                  Ainda não faz parte da nossa rede? Solicite seu credenciamento agora mesmo!
                </p>
                <Button
                  onClick={() => setIsRightPanelActive(true)}
                  variant="outline"
                  className="rounded-xl border-2 border-white/80 bg-transparent text-white hover:bg-white hover:text-teal-800 font-semibold text-sm py-3 px-10 h-11 transition-all duration-300 active:scale-95"
                >
                  Solicitar Credenciamento
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </TooltipProvider>
  )
}