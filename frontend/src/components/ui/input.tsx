import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      // Disabling and hover ease; focus, usually reached by Tab, appears instantly.
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-paper px-3.5 text-base text-ink transition-[border-color,box-shadow,opacity,background-color] duration-200 focus-visible:transition-none outline-none placeholder:text-ink-secondary/60 hover:border-ink-secondary/50 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/10 disabled:cursor-not-allowed disabled:bg-tint disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10",
        className
      )}
      {...props}
    />
  )
}

export { Input }
