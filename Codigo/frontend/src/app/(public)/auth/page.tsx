import React, { JSX } from "react"
import Form from "./components/form"
import { ModeToggle } from "@/components/ui/toggle-theme"

export default function Auth(): JSX.Element {

  return (
    <div className="w-screen h-screen flex relative">
      
      <Form />
      <div className="absolute top-5 right-5">
      </div>
    </div>
  )
}