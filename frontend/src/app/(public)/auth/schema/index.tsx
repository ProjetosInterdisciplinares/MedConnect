"use client"

import { z } from "zod"

function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "")
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false

  const calc = (slice: string, weights: number[]) => {
    const sum = slice.split("").reduce((acc, d, i) => acc + Number(d) * weights[i], 0)
    const rem = sum % 11
    return rem < 2 ? 0 : 11 - rem
  }

  const first = calc(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  if (first !== Number(digits[12])) return false

  const second = calc(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return second === Number(digits[13])
}

export const authSchema = z.object({
  cnpj: z.string()
    .min(1, "CNPJ é um campo obrigatório")
    .refine(isValidCNPJ, "O CNPJ é inválido"),
  password: z.string()
    .min(6, "A senha deve conter pelo menos 6 caractéres")
})

export const registerSchema = z.object({
  nm_pessoaj: z.string()
    .min(3, "Nome da empresa é obrigatório (mín. 3 caracteres)"),

  razao_social: z.string()
    .min(3, "Razão social é obrigatória (mín. 3 caracteres)"),

  nr_cnpj: z.string()
    .min(1, "CNPJ é obrigatório")
    .refine(isValidCNPJ, "O CNPJ informado é inválido"),

  email_pj: z.string()
    .min(1, "E-mail é obrigatório")
    .email("Formato de e-mail inválido"),

  resp_tec: z.string()
    .min(3, "Responsável técnico é obrigatório (mín. 3 caracteres)"),

  senha_pj: z.string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos 1 letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos 1 letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos 1 número")
    .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos 1 caractere especial (!@#$%...)")
})

export const resetPasswordSchema = z.object({
  cnpj: z.string()
    .min(1, "CNPJ é obrigatório")
    .refine(isValidCNPJ, "O CNPJ informado é inválido"),
  email: z.string()
    .min(1, "E-mail é obrigatório")
    .email("Formato de e-mail inválido"),
  new_password: z.string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos 1 letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos 1 letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos 1 número")
    .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos 1 caractere especial (!@#$%...)"),
  confirm_password: z.string()
    .min(1, "A confirmação de senha é obrigatória")
}).refine((data) => data.new_password === data.confirm_password, {
  message: "As senhas não coincidem",
  path: ["confirm_password"],
})