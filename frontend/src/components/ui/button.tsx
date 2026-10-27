import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex max-w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent text-center font-semibold outline-none select-none transition-press focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:border-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brown text-paper hover:bg-ink",
        outline: "border-input bg-paper text-ink hover:border-ink-secondary hover:bg-tint",
        ghost: "text-ink-secondary hover:bg-tint hover:text-ink",
        link: "text-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-10 px-4 py-2 text-sm",
        sm: "min-h-8 rounded-md px-3 py-1 text-[0.8125rem]",
        lg: "min-h-12 rounded-xl px-6 py-2.5 text-base",
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
  const Comp = asChild ? Slot.Root : "button"

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
