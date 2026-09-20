import { cn } from "@/lib/utils"
import React, { HTMLAttributes, JSX } from "react"

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
  isDark?: boolean
} 

export default function Logo({ size = 24, isDark = false, ...props }: LogoProps): JSX.Element {
  return (
    <div
      style={{ fontSize: size }}
      {...props}
    >
      MedConnect
    </div>
  )
}