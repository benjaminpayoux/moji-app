import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full py-4 px-5 font-[family-name:var(--font-quicksand)] font-semibold text-[1.1rem] border-4 border-[#e9d5ff] rounded-[1rem] bg-white outline-none relative z-[1] transition-[border-color] duration-200 placeholder:text-[#c4b5fd] focus:border-[#a78bfa] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "[&.error]:border-[#f87171]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
