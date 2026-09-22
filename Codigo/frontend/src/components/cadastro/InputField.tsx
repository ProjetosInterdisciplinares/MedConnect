"use client"

import React, { forwardRef } from "react"
import { AlertCircle } from "lucide-react"

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string
  icon: React.ElementType
  rightElement?: React.ReactNode
  error?: string
  type?: "text" | "number" | "date" | "textarea" | string
}

const InputField = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputFieldProps>(
  ({ label, icon: Icon, rightElement, error, type = "text", className = "", required, ...props }, ref) => {
    
    return (
      <div className="flex flex-col gap-1 text-left">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
            {label}
            {required && <span className="text-red-500 text-xs mt-0.5" aria-hidden="true">*</span>}
          </label>
          {rightElement}
        </div>
        
        <div className="relative">
          <div className="absolute left-3 top-[11px] text-slate-400 pointer-events-none">
            <Icon size={16} />
          </div>
          
          {type === "textarea" ? (
            <textarea
              {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={`w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl transition-all duration-200 outline-none min-h-[120px] resize-y text-sm ${
                error
                  ? "border-red-300 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:border-red-400"
                  : "border-slate-200 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 hover:border-slate-300"
              } ${className}`}
            />
          ) : (
            <input
              {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
              ref={ref as React.Ref<HTMLInputElement>}
              type={type}
              className={`w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl transition-all duration-200 outline-none h-10 text-sm ${
                error
                  ? "border-red-300 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:border-red-400"
                  : "border-slate-200 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 hover:border-slate-300"
              } ${className}`}
            />
          )}
        </div>
        
        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </p>
        )}
      </div>
    )
  }
)

InputField.displayName = "InputField"

export default InputField