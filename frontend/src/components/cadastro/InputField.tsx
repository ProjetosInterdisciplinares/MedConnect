"use client"

import React from "react"

interface InputFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: React.ElementType
}

export default function InputField({
  label,
  icon: Icon,
  ...props
}: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {label}
      </label>

      <div className="relative">
        <div className="absolute left-3 top-2.5 text-zinc-400">
          <Icon size={16} />
        </div>

        <input
          {...props}
          className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-sm"
        />
      </div>
    </div>
  )
}