import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "w-full py-4 px-8 font-[family-name:var(--font-quicksand)] font-bold text-[1.1rem] text-white bg-[#a78bfa] border-none rounded-[1rem] cursor-pointer relative z-[1] transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "shadow-[0_4px_0px_#7c3aed] hover:translate-y-[-2px] hover:shadow-[0_6px_0px_#7c3aed] active:translate-y-[2px] active:shadow-[0_2px_0px_#7c3aed]",
        destructive:
          "bg-[#f87171] shadow-[0_4px_0px_#dc2626] hover:translate-y-[-2px] hover:shadow-[0_6px_0px_#dc2626] active:translate-y-[2px] active:shadow-[0_2px_0px_#dc2626]",
        outline:
          "bg-white text-[#7c3aed] border-4 border-[#e9d5ff] shadow-none hover:bg-[#f5f3ff]",
        secondary:
          "bg-[#ec4899] shadow-[0_4px_0px_#be185d] hover:translate-y-[-2px] hover:shadow-[0_6px_0px_#be185d] active:translate-y-[2px] active:shadow-[0_2px_0px_#be185d]",
        ghost:
          "bg-transparent text-[#7c3aed] shadow-none hover:bg-[#f5f3ff]",
        link: "bg-transparent text-[#7c3aed] shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default: "py-4 px-8",
        sm: "py-3 px-6 text-[1rem] rounded-[0.75rem]",
        lg: "py-5 px-10 text-[1.2rem]",
        icon: "w-12 h-12 p-0",
        "icon-sm": "w-10 h-10 p-0",
        "icon-lg": "w-14 h-14 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
