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
import { authSchema } from "../schema"
import { formatCNPJ } from "@/lib/format/format-document"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { z } from "zod"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import servicesAuth from "@/server/(POST)-auth"
import { ArrowRight } from "lucide-react"
import { registerSchema } from "../schema"
import servicesRegister from "@/server/(POST)-register"


export default function Form(): JSX.Element {
  const router = useRouter()
  const [isSubmit, startSubmit] = useTransition()
  
  const [isRightPanelActive, setIsRightPanelActive] = useState(false)

  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      cnpj: "",
      password: ""
    },
  })

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nm_pessoaj: "",
      razao_social: "",
      nr_cnpj: "",
      email_pj: "",
      resp_tec: "",
      senha_pj: ""
    }
  })

  const onSubmit = (data: z.infer<typeof authSchema>): void => {
    startSubmit(async () => {
      const response = await servicesAuth(data)
      
      if ("isError" in response) { return }
      
      localStorage.setItem("token", response.access)
      localStorage.setItem("cnpj", response.cnpj)
      localStorage.setItem("userId", String(response.id))
      router.push("/catalogo")
    })
  }

  const onRegister = (data: z.infer<typeof registerSchema>): void => {
    startSubmit(async () => {
      const response = await servicesRegister(data)

      if ("isError" in response) {
        alert(response.message)
        return
      }

      alert(
        "Solicitação enviada com sucesso! Aguarde aprovação."
      )

      registerForm.reset()

      setIsRightPanelActive(false)
    })
  }

  return (
      <div className="min-h-screen w-full flex items-start justify-center pt-16 md:pt-24 bg-gray-100 pb-0 font-sans text-gray-900">
      {/* container principal da animacao show de bola de um lado pro outro */}
      <div className="relative overflow-hidden w-full max-w-212.5 min-h-120 bg-white rounded-2xl shadow-2xl z-0">

        {/* painel para cadastrar nova pessoa juridica */}
        <div 
          className={`absolute top-0 left-0 h-full w-full md:w-1/2 transition-all duration-700 ease-in-out 
          ${isRightPanelActive 
            ? 'md:translate-x-full opacity-100 z-50 pointer-events-auto' 
            : 'opacity-0 z-10 pointer-events-none hidden md:block'}`}
        >
          <div className="flex flex-col items-center justify-center h-full px-10 py-6 text-center bg-white">
            <h1 className="font-bold text-3xl mb-4 text-sky-800">Criar Conta</h1>
            <p className="text-sm text-gray-500 mb-6">Insira seus dados para começar</p>
            
            <form
              onSubmit={registerForm.handleSubmit(onRegister)}
              className="w-full flex flex-col gap-3"
            >            
              <Input
                placeholder="Nome da Empresa" className="bg-gray-100 border-none px-4 py-3 h-9"
                {...registerForm.register("nm_pessoaj")}
              />

              <Input
                placeholder="Razão Social" className="bg-gray-100 border-none px-4 py-3 h-9"
                {...registerForm.register("razao_social")}
              />

              <Input
                placeholder="CNPJ" className="bg-gray-100 border-none px-4 py-3 h-9"
                {...registerForm.register("nr_cnpj")}
              />

              <Input
                placeholder="E-mail" className="bg-gray-100 border-none px-4 py-3 h-9"
                {...registerForm.register("email_pj")}
              />

              <Input
                placeholder="Responsável Técnico" className="bg-gray-100 border-none px-4 py-3 h-9"
                {...registerForm.register("resp_tec")}
              />

              <Input
                type="password"
                placeholder="Senha" className="bg-gray-100 border-none px-4 py-3 h-10"
                {...registerForm.register("senha_pj")}
              />
              <Button
                type="submit"
                className="rounded-full bg-sky-800 hover:bg-sky-900 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-10 mt-2 h-12 transition-transform active:scale-95"
              >
                Solicitar Credenciamento
              </Button>
            </form>

            <button 
              onClick={() => setIsRightPanelActive(false)} 
              className="md:hidden mt-6 text-sm text-sky-800 font-semibold underline"
            >
              Já tem uma conta? Entrar
            </button>
          </div>
        </div>

        {/* painel para login de pessoa juridica ja existente e aprovada pelo admin, pendente nao consegue entrar */}
        <div 
          className={`absolute top-0 left-0 h-full w-full md:w-1/2 transition-all duration-700 ease-in-out z-20 
          ${isRightPanelActive 
            ? 'md:translate-x-full opacity-0 pointer-events-none hidden md:block' 
            : 'opacity-100 pointer-events-auto'}`}
        >
          <div className="flex flex-col items-center justify-center h-full px-10 py-6 text-center bg-white">
            <h1 className="font-bold text-3xl mb-4 text-sky-800">Log In</h1>
            <p className="text-sm text-gray-500 mb-6">Use suas credenciais corporativas</p>

            <form
              id="form-rhf-demo"
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-full flex flex-col gap-3"
            >
              <FieldGroup className="flex flex-col gap-3 w-full">
                <Controller
                  name="cnpj"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="w-full">
                      <FieldLabel htmlFor="cnpj-input" className="sr-only">CNPJ</FieldLabel>
                      <Input
                        id="cnpj-input"
                        maxLength={18}
                        disabled={isSubmit}
                        value={formatCNPJ(field.value)}
                        onChange={(event) => {
                          const rawValue = event.target.value.replace(/\D/g, "")
                          field.onChange(rawValue)
                        }}
                        aria-invalid={fieldState.invalid}
                        placeholder="CNPJ (00.000.000/0000-00)"
                        autoComplete="off"
                        className="w-full bg-gray-100 border-none px-4 py-3 h-12 focus-visible:ring-sky-800 rounded-md"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="w-full">
                      <FieldLabel htmlFor="password-input" className="sr-only">Senha</FieldLabel>
                      <Input
                        {...field}
                        id="password-input"
                        type="password"
                        maxLength={20}
                        disabled={isSubmit}
                        aria-invalid={fieldState.invalid}
                        placeholder="Senha"
                        autoComplete="current-password"
                        className="w-full bg-gray-100 border-none px-4 py-3 h-12 focus-visible:ring-sky-800 rounded-md"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </FieldGroup>

              <a href="#" className="text-sm text-gray-500 hover:text-sky-800 hover:underline my-2">
                Esqueceu sua senha?
              </a>

              <Button
                type="submit"
                disabled={isSubmit}
                className="w-full rounded-full bg-sky-800 hover:bg-sky-900 text-white font-bold text-xs uppercase tracking-wider py-3.5 h-12 flex items-center justify-center transition-transform active:scale-95"
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
              className="md:hidden mt-6 text-sm text-sky-800 font-semibold underline"
            >
              Não tem conta? Cadastre-se
            </button>
          </div>
        </div>

        {/* overlay para mudar de login para cadastro com animacaozinha */}
        <div 
          className={`hidden md:block absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-transform duration-700 ease-in-out z-100 
          ${isRightPanelActive ? '-translate-x-full' : 'translate-x-0 z-0' }`}
        >
          <div 
            className={`bg-linear-to-br from-sky-800 via-sky-700 to-sky-900 text-white relative -left-full h-full w-[200%] transition-transform duration-700 ease-in-out 
            ${isRightPanelActive ? 'translate-x-1/2' : 'translate-x-0'}`}
          >
            
            {/* texto do lado esquerdo do overlay*/}
            <div 
              className={`absolute top-0 flex flex-col items-center justify-center px-12 text-center h-full w-1/2 transition-transform duration-700 ease-in-out 
              ${isRightPanelActive ? 'translate-x-0' : 'translate-x-[-20%]'}`}
            >
              <h1 className="font-bold text-4xl mb-6">Bem-vindo<br/>de volta!</h1>
              <p className="text-sm font-light leading-relaxed tracking-wide mb-8">
                Para se manter conectado conosco, faça login com suas credenciais corporativas.
              </p>
              <Button 
                onClick={() => setIsRightPanelActive(false)}
                variant="outline"
                className="rounded-full border-2 border-white bg-transparent text-white hover:bg-white hover:text-sky-800 font-bold text-xs uppercase tracking-wider py-3.5 px-12 h-12 transition-transform active:scale-95"
              >
                Entrar
              </Button>
            </div>

            {/* texto do lado direito do overlay */}
            <div 
              className={`absolute top-0 right-0 flex flex-col items-center justify-center px-12 text-center h-full w-1/2 transition-transform duration-700 ease-in-out 
              ${isRightPanelActive ? 'translate-x-[20%]' : 'translate-x-0'}`}
            >
              <h1 className="font-bold text-4xl mb-6">Olá, Parceiro!</h1>
              <p className="text-sm font-light leading-relaxed tracking-wide mb-8">
                Ainda não faz parte da nossa rede? Solicite seu credenciamento agora mesmo!
              </p>
              <Button 
                onClick={() => setIsRightPanelActive(true)}
                variant="outline"
                className="rounded-full border-2 border-white bg-transparent text-white hover:bg-white hover:text-sky-800 font-bold text-xs uppercase tracking-wider py-3.5 px-12 h-12 transition-transform active:scale-95"
              >
                Solicitar Credenciamento
              </Button>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}