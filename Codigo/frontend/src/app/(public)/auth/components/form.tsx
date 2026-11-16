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
import { formatCNPJ, formatNumeroEndereco, formatTelefone } from "@/lib/format/format-document"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { z } from "zod"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import servicesAuth from "@/server/(POST)-auth"
import servicesPasswordReset from "@/server/(POST)-password-reset"
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
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
import { AuthManager } from "@/lib/AuthManager"
import { registerSchema } from "../schema"
import servicesRegister from "@/server/(POST)-register"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"



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
      className="text-sm font-medium text-slate-700 flex items-center gap-1"
    >
      {children}
      <span className="text-red-500 text-xs" aria-hidden="true">*</span>
    </label>
  )
}

/* ─── Mensagem de erro de campo ─────────────────────────────── */
function MensagemErro({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="text-xs text-red-500 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {msg}
    </p>
  )
}

function inputCls(hasError: boolean, extra = "") {
  return `${extra} h-10 bg-surface-subtle border rounded-xl transition-colors duration-200
    ${hasError
      ? "border-red-300 focus-visible:ring-red-400"
      : "border-border focus-visible:ring-blue-500 hover:border-slate-300"}`
}

const CAMPOS_ETAPA_1 = ["nm_pessoaj", "razao_social", "nr_cnpj", "resp_tec"] as const


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
  const [addressFetched, setAddressFetched] = useState(false)
  const [enderecoManual, setEnderecoManual] = useState(false)
  const [enderecoResumo, setEnderecoResumo] = useState("")
  const [registerStep, setRegisterStep] = useState<1 | 2>(1)
  const [registerSent, setRegisterSent] = useState(false)
  const [empresaEnviada, setEmpresaEnviada] = useState("")

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
      senha_pj: "",
      cep: "",
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "",
      telefone: "",
      latitude: null,
      longitude: null,
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
  const rErr = registerForm.formState.errors

  const avancarEtapa = async () => {
    const ok = await registerForm.trigger([...CAMPOS_ETAPA_1])
    if (ok) setRegisterStep(2)
  }

  const fetchAddressByCep = async (cep: string) => {
    const numericCep = cep.replace(/\D/g, "");
    if (numericCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${numericCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado.");
        setAddressFetched(false);
        return;
      }

      setAddressFetched(true);
      // CEP geral de cidade não traz rua/bairro: libera o logradouro para digitação
      setEnderecoManual(!data.logradouro);
      setEnderecoResumo(
        [data.logradouro, data.bairro].filter(Boolean).join(", ") + ` · ${data.localidade}/${data.uf}`
      );
      registerForm.setValue("logradouro", data.logradouro || "");
      registerForm.setValue("bairro", data.bairro || "");
      registerForm.setValue("cidade", data.localidade || "");
      registerForm.setValue("estado", data.uf || "");
      registerForm.clearErrors(["cep", "logradouro", "bairro", "cidade", "estado"]);

      // Geocode via Nominatim
      const query = encodeURIComponent(`${data.logradouro}, ${data.localidade}, ${data.uf}, Brasil`);
      const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
      const nomData = await nominatimRes.json();

      if (nomData && nomData.length > 0) {
        registerForm.setValue("latitude", parseFloat(nomData[0].lat));
        registerForm.setValue("longitude", parseFloat(nomData[0].lon));
      } else {
        const cityQuery = encodeURIComponent(`${data.localidade}, ${data.uf}, Brasil`);
        const nomCityRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cityQuery}`);
        const nomCityData = await nomCityRes.json();
        if (nomCityData && nomCityData.length > 0) {
          registerForm.setValue("latitude", parseFloat(nomCityData[0].lat));
          registerForm.setValue("longitude", parseFloat(nomCityData[0].lon));
        }
      }
    } catch (error) {
      console.error("Erro ao buscar CEP", error);
    }
  };

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

        AuthManager.getInstance().setAuth(response.id, response.access)
        localStorage.setItem("cnpj", response.cnpj)
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

        setEmpresaEnviada(data.nm_pessoaj)
        registerForm.reset()
        setAddressFetched(false)
        setEnderecoManual(false)
        setRegisterStep(1)
        setRegisterSent(true)
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
      <div className="relative h-full w-full flex items-center justify-center px-4 py-6 font-sans text-heading overflow-hidden">



        {/* container principal da animação */}
        <div className="relative overflow-hidden w-full max-w-[850px] h-[620px] max-h-full bg-white/85 backdrop-blur-md rounded-3xl z-10"
          style={{ boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.03)" }}
        >

          {/* ═══════════════ PAINEL DE CADASTRO ═══════════════ */}
          <div
            className={`absolute top-0 left-0 h-full w-full md:w-1/2 transition-all duration-700 ease-in-out
            ${isRightPanelActive
                ? 'md:translate-x-full opacity-100 z-50 pointer-events-auto'
                : 'opacity-0 z-10 pointer-events-none hidden md:block'}`}
          >
            <div className="flex flex-col h-full px-8 py-6 text-center bg-white overflow-y-auto">
              <div className="w-full max-w-[360px] mx-auto my-auto">
                {registerSent ? (
                  /* ─── Confirmação da solicitação ─── */
                  <div className="text-left animate-in fade-in duration-300">
                    <div className="w-11 h-11 rounded-xl bg-brand-subtle text-brand flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h1 className="mt-4 font-bold text-2xl text-heading">Solicitação enviada</h1>
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                      O cadastro de <span className="font-semibold text-main">{empresaEnviada}</span> foi recebido e será analisado pela equipe MedConnect.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-main">
                      <li className="flex gap-2"><span className="text-brand font-semibold">1.</span> Conferimos os dados e o CNPJ da instituição.</li>
                      <li className="flex gap-2"><span className="text-brand font-semibold">2.</span> Após a aprovação, você entra com o CNPJ e a senha cadastrados.</li>
                    </ul>
                    <Button
                      type="button"
                      onClick={() => {
                        setRegisterSent(false)
                        setIsRightPanelActive(false)
                      }}
                      className="mt-6 w-full rounded-xl text-white font-semibold text-sm h-11 bg-brand hover:bg-brand-hover"
                    >
                      Voltar para o login
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 text-left">
                      <h1 className="font-bold text-2xl text-heading">Criar Conta</h1>
                      <p className="text-sm text-slate-500 mt-0.5">Solicite o credenciamento da sua instituição</p>
                      <div className="mt-3 flex items-center gap-2" aria-label={`Etapa ${registerStep} de 2`}>
                        <span className={`h-1 flex-1 rounded-full ${registerStep >= 1 ? "bg-brand" : "bg-slate-200"}`} />
                        <span className={`h-1 flex-1 rounded-full ${registerStep >= 2 ? "bg-brand" : "bg-slate-200"}`} />
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-slate-500">
                        Etapa {registerStep} de 2 · {registerStep === 1 ? "Dados da empresa" : "Contato, endereço e acesso"}
                      </p>
                    </div>

                    <form
                      onSubmit={registerForm.handleSubmit(onRegister)}
                      className="w-full flex flex-col gap-2.5 text-left"
                      noValidate
                    >
                      {registerStep === 1 ? (
                        <>
                          {/* Nome da Empresa */}
                          <div className="flex flex-col gap-1">
                            <RequiredLabel htmlFor="reg-nome">Nome da Empresa</RequiredLabel>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                              <Input id="reg-nome" placeholder="Ex: MedTech Ltda" className={inputCls(!!rErr.nm_pessoaj, "pl-10")} {...registerForm.register("nm_pessoaj")} />
                            </div>
                            <MensagemErro msg={rErr.nm_pessoaj?.message} />
                          </div>

                          {/* Razão Social */}
                          <div className="flex flex-col gap-1">
                            <RequiredLabel htmlFor="reg-razao">Razão Social</RequiredLabel>
                            <div className="relative">
                              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                              <Input id="reg-razao" placeholder="Ex: MedTech Comércio Ltda" className={inputCls(!!rErr.razao_social, "pl-10")} {...registerForm.register("razao_social")} />
                            </div>
                            <MensagemErro msg={rErr.razao_social?.message} />
                          </div>

                          {/* CNPJ */}
                          <div className="flex flex-col gap-1">
                            <RequiredLabel htmlFor="reg-cnpj">CNPJ</RequiredLabel>
                            <div className="relative">
                              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                              <Input
                                id="reg-cnpj"
                                placeholder="00.000.000/0000-00"
                                maxLength={18}
                                inputMode="numeric"
                                className={inputCls(!!rErr.nr_cnpj, "pl-10")}
                                {...registerForm.register("nr_cnpj", {
                                  onChange: (e) => { e.target.value = formatCNPJ(e.target.value) }
                                })}
                              />
                            </div>
                            <MensagemErro msg={rErr.nr_cnpj?.message} />
                          </div>

                          {/* Responsável Técnico */}
                          <div className="flex flex-col gap-1">
                            <RequiredLabel htmlFor="reg-resp">Responsável Técnico</RequiredLabel>
                            <div className="relative">
                              <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                              <Input id="reg-resp" placeholder="Nome completo" className={inputCls(!!rErr.resp_tec, "pl-10")} {...registerForm.register("resp_tec")} />
                            </div>
                            <MensagemErro msg={rErr.resp_tec?.message} />
                          </div>

                          <Button
                            type="button"
                            onClick={avancarEtapa}
                            className="rounded-xl text-white font-semibold text-sm h-11 mt-2 bg-brand hover:bg-brand-hover"
                          >
                            <span className="flex items-center gap-2">Continuar <ArrowRight className="w-4 h-4" /></span>
                          </Button>
                        </>
                      ) : (
                        <>
                          {/* E-mail */}
                          <div className="flex flex-col gap-1">
                            <RequiredLabel htmlFor="reg-email">E-mail Corporativo</RequiredLabel>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                              <Input id="reg-email" type="email" placeholder="contato@empresa.com.br" className={inputCls(!!rErr.email_pj, "pl-10")} {...registerForm.register("email_pj")} />
                            </div>
                            <MensagemErro msg={rErr.email_pj?.message} />
                          </div>

                          {/* Telefone e CEP */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <RequiredLabel htmlFor="reg-telefone">Telefone</RequiredLabel>
                              <Input
                                id="reg-telefone"
                                type="tel"
                                inputMode="numeric"
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                                className={inputCls(!!rErr.telefone)}
                                {...registerForm.register("telefone", {
                                  onChange: (e) => { e.target.value = formatTelefone(e.target.value) }
                                })}
                              />
                              <MensagemErro msg={rErr.telefone?.message} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <RequiredLabel htmlFor="reg-cep">CEP</RequiredLabel>
                              <Input
                                id="reg-cep"
                                inputMode="numeric"
                                placeholder="00000-000"
                                maxLength={9}
                                className={inputCls(!!rErr.cep || (!addressFetched && !!rErr.logradouro))}
                                {...registerForm.register("cep", {
                                  onChange: (e) => {
                                    let val = e.target.value.replace(/\D/g, "")
                                    if (val.length > 5) val = val.substring(0, 5) + "-" + val.substring(5, 8)
                                    e.target.value = val
                                    if (val.length === 9) fetchAddressByCep(val)
                                    else setAddressFetched(false)
                                  }
                                })}
                              />
                              <MensagemErro msg={rErr.cep?.message ?? (!addressFetched && rErr.logradouro ? "Informe um CEP válido" : undefined)} />
                            </div>
                          </div>

                          {/* Endereço + Número */}
                          <div className="grid grid-cols-[1fr_6.5rem] gap-3">
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-sm font-medium text-slate-700">Endereço</span>
                              {addressFetched && enderecoManual ? (
                                <Input
                                  id="reg-logradouro"
                                  placeholder="Rua / Avenida"
                                  className={inputCls(!!rErr.logradouro)}
                                  {...registerForm.register("logradouro")}
                                />
                              ) : (
                                <div className="h-10 px-3 flex items-center gap-2 rounded-xl border border-border bg-surface-muted text-sm min-w-0">
                                  <MapPin className="w-4 h-4 shrink-0 text-subtle" aria-hidden="true" />
                                  <span title={addressFetched ? enderecoResumo : undefined} className={`truncate ${addressFetched ? "text-main" : "text-slate-400"}`}>
                                    {addressFetched ? enderecoResumo : "Preenchido pelo CEP"}
                                  </span>
                                </div>
                              )}
                              {addressFetched && enderecoManual && <MensagemErro msg={rErr.logradouro?.message} />}
                              {addressFetched && enderecoManual && (
                                <>
                                  <Input
                                    id="reg-bairro"
                                    placeholder="Bairro"
                                    className={inputCls(!!rErr.bairro, "mt-1.5")}
                                    {...registerForm.register("bairro")}
                                  />
                                  <MensagemErro msg={rErr.bairro?.message} />
                                </>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <RequiredLabel htmlFor="reg-numero">Número</RequiredLabel>
                              <Input
                                id="reg-numero"
                                placeholder="Nº ou S/N"
                                maxLength={6}
                                className={inputCls(!!rErr.numero)}
                                {...registerForm.register("numero", {
                                  onChange: (e) => { e.target.value = formatNumeroEndereco(e.target.value) }
                                })}
                              />
                              <MensagemErro msg={rErr.numero?.message} />
                            </div>
                          </div>

                          {/* Senha */}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <RequiredLabel htmlFor="reg-senha">Senha</RequiredLabel>
                              <Tooltip>
                                <TooltipTrigger
                                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 hover:bg-blue-100 transition-colors cursor-help"
                                  type="button"
                                  aria-label="Requisitos de senha"
                                >
                                  <HelpCircle className="w-3 h-3 text-slate-500" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[260px] p-3 text-left">
                                  <p className="font-semibold text-xs mb-1.5">Requisitos de senha segura:</p>
                                  <ul className="text-xs space-y-1">
                                    {[
                                      [(watchPassword?.length || 0) >= 8, "Mínimo 8 caracteres"],
                                      [/[A-Z]/.test(watchPassword || ""), "1 letra maiúscula (A-Z)"],
                                      [/[a-z]/.test(watchPassword || ""), "1 letra minúscula (a-z)"],
                                      [/[0-9]/.test(watchPassword || ""), "1 número (0-9)"],
                                      [/[^A-Za-z0-9]/.test(watchPassword || ""), "1 caractere especial (!@#$%...)"],
                                    ].map(([ok, label]) => (
                                      <li key={label as string} className="flex items-center gap-1.5">
                                        {ok
                                          ? <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                                          : <AlertCircle className="w-3 h-3 text-subtle shrink-0" />}
                                        {label as string}
                                      </li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                              {watchPassword && watchPassword.length > 0 && (
                                <span className="ml-auto text-xs font-medium" style={{ color: passwordStrength.color }}>
                                  {passwordStrength.label}
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                              <Input
                                id="reg-senha"
                                type={showRegisterPassword ? "text" : "password"}
                                placeholder="Crie uma senha segura"
                                className={inputCls(!!rErr.senha_pj, "pl-10 pr-10")}
                                {...registerForm.register("senha_pj")}
                              />
                              <button
                                type="button"
                                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-slate-600 transition-colors"
                                aria-label={showRegisterPassword ? "Ocultar senha" : "Mostrar senha"}
                              >
                                {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            {watchPassword && watchPassword.length > 0 && (
                              <div className="h-1 bg-surface-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500 ease-out"
                                  style={{ width: `${(passwordStrength.score / 5) * 100}%`, backgroundColor: passwordStrength.color }}
                                />
                              </div>
                            )}
                            <MensagemErro msg={rErr.senha_pj?.message} />
                          </div>

                          <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isSubmit}
                              onClick={() => setRegisterStep(1)}
                              className="rounded-xl h-11 px-4 text-sm font-semibold"
                            >
                              <ArrowLeft className="w-4 h-4" /> Voltar
                            </Button>
                            <Button
                              type="submit"
                              disabled={isSubmit}
                              className="rounded-xl text-white font-semibold text-sm h-11 bg-brand hover:bg-brand-hover"
                            >
                              {isSubmit ? (
                                <span className="flex items-center gap-2">Enviando... <Spinner className="w-4 h-4" /></span>
                              ) : (
                                "Solicitar Credenciamento"
                              )}
                            </Button>
                          </div>
                        </>
                      )}

                      <p className="text-[11px] text-subtle text-center">
                        Campos com <span className="text-red-500">*</span> são obrigatórios
                      </p>
                    </form>

                    <button
                      onClick={() => setIsRightPanelActive(false)}
                      className="md:hidden mt-3 w-full text-sm text-blue-700 font-semibold hover:underline transition-colors"
                    >
                      Já tem uma conta? Entrar
                    </button>
                  </>
                )}
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
                        style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-hover))" }}
                      >
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="font-bold text-2xl text-heading">Bem-vindo</h1>
                      <p className="text-sm text-slate-500 mt-1">Acesse com suas credenciais corporativas</p>
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
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                          <Input
                            id="cnpj-input"
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                            disabled={isSubmit}
                            className={`w-full pl-10 h-10 bg-surface-subtle border rounded-xl transition-all duration-200
                              ${form.formState.errors.cnpj
                                ? "border-red-300 focus-visible:ring-red-400"
                                : "border-border focus-visible:ring-blue-500 hover:border-slate-300"}`}
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
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                          <Input
                            id="password-input"
                            type={showLoginPassword ? "text" : "password"}
                            maxLength={20}
                            disabled={isSubmit}
                            placeholder="Sua senha corporativa"
                            autoComplete="current-password"
                            className={`w-full pl-10 pr-10 h-10 bg-surface-subtle border rounded-xl transition-all duration-200
                              ${form.formState.errors.password
                                ? "border-red-300 focus-visible:ring-red-400"
                                : "border-border focus-visible:ring-blue-500 hover:border-slate-300"}`}
                            {...form.register("password", {
                              onChange: () => setLoginError(null)
                            })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-slate-600 transition-colors"
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
                        className="text-sm text-slate-500 hover:text-blue-700 hover:underline transition-colors self-end -mt-1"
                      >
                        Esqueceu sua senha?
                      </button>

                      <Button
                        type="submit"
                        disabled={isSubmit}
                        className="w-full rounded-xl text-white font-semibold text-sm py-3.5 h-12 flex items-center justify-center transition-all duration-300 hover:shadow-lg active:scale-[0.98] mt-2"
                        style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-hover))", boxShadow: "0 4px 15px rgba(13, 148, 136, 0.2)" }}
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
                      className="md:hidden mt-6 text-sm text-blue-700 font-semibold hover:underline transition-colors"
                    >
                      Não tem conta? Cadastre-se
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
                        style={{ background: "linear-gradient(135deg, var(--brand-navy), var(--brand-header))" }}
                      >
                        <UserCog className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="font-bold text-2xl text-heading">Recuperar Senha</h1>
                      <p className="text-sm text-slate-500 mt-1">Informe os dados da empresa para redefinir o acesso.</p>
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
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                          <Input
                            id="reset-cnpj"
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                            disabled={isSubmit}
                            className={`w-full pl-10 h-10 bg-surface-subtle border rounded-xl transition-all duration-200
                              ${resetPasswordForm.formState.errors.cnpj ? "border-red-300 focus-visible:ring-red-400" : "border-border focus-visible:ring-blue-500 hover:border-slate-300"}`}
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
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                          <Input
                            id="reset-email"
                            type="email"
                            disabled={isSubmit}
                            placeholder="exemplo@empresa.com"
                            className={`w-full pl-10 pr-4 bg-surface-subtle border py-2.5 h-11 rounded-xl transition-all duration-200
                              ${resetPasswordForm.formState.errors.email ? "border-red-300 focus-visible:ring-red-400" : "border-border focus-visible:ring-blue-500"}`}
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
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                          <Input
                            id="reset-new-password"
                            type={showResetNewPassword ? "text" : "password"}
                            disabled={isSubmit}
                            placeholder="Digite a nova senha"
                            className={`w-full pl-10 pr-10 bg-surface-subtle border py-2.5 h-11 rounded-xl transition-all duration-200
                              ${resetPasswordForm.formState.errors.new_password ? "border-red-300 focus-visible:ring-red-400" : "border-border focus-visible:ring-blue-500"}`}
                            {...resetPasswordForm.register("new_password", {
                              onChange: () => setResetError(null)
                            })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-slate-600 transition-colors"
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
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                          <Input
                            id="reset-confirm-password"
                            type={showResetConfirmPassword ? "text" : "password"}
                            disabled={isSubmit}
                            placeholder="Repita a nova senha"
                            className={`w-full pl-10 pr-10 bg-surface-subtle border py-2.5 h-11 rounded-xl transition-all duration-200
                              ${resetPasswordForm.formState.errors.confirm_password ? "border-red-300 focus-visible:ring-red-400" : "border-border focus-visible:ring-blue-500"}`}
                            {...resetPasswordForm.register("confirm_password", {
                              onChange: () => setResetError(null)
                            })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-slate-600 transition-colors"
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
                          style={{ background: "linear-gradient(135deg, var(--brand-navy), var(--brand-header))", boxShadow: "0 4px 15px rgba(23, 37, 84, 0.2)" }}
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
                          className="text-sm font-semibold text-slate-500 hover:text-main py-2 transition-colors disabled:opacity-50"
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
              style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)" }}
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
                <p className="text-sm font-light leading-relaxed tracking-wide mb-8 text-blue-100">
                  Para se manter conectado conosco, faça login com suas credenciais corporativas.
                </p>
                <Button
                  onClick={() => setIsRightPanelActive(false)}
                  variant="outline"
                  className="rounded-xl border-2 border-white/80 bg-transparent text-white hover:bg-white hover:text-blue-800 font-semibold text-sm py-3 px-10 h-11 transition-all duration-300 active:scale-95"
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
                <p className="text-sm font-light leading-relaxed tracking-wide mb-8 text-blue-100">
                  Ainda não faz parte da nossa rede? Solicite seu credenciamento agora mesmo!
                </p>
                <Button
                  onClick={() => setIsRightPanelActive(true)}
                  variant="outline"
                  className="rounded-xl border-2 border-white/80 bg-transparent text-white hover:bg-white hover:text-blue-800 font-semibold text-sm py-3 px-10 h-11 transition-all duration-300 active:scale-95"
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