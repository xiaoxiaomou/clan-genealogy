import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "glass-btn inline-flex items-center justify-center gap-2 whitespace-nowrap text-[15px] font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground border border-primary/20 hover:bg-primary/90 shadow-glass-btn",
        secondary:
          "bg-foreground/8 text-foreground border border-border/50 hover:bg-foreground/12",
        ghost:
          "bg-transparent text-foreground border-transparent hover:bg-foreground/6",
        outline:
          "bg-transparent text-link border border-link/40 hover:bg-link/8",
        destructive:
          "bg-destructive/90 text-destructive-foreground border border-destructive/30 hover:bg-destructive shadow-glass-btn",
        success:
          "bg-success/90 text-success-foreground border border-success/30 hover:bg-success shadow-glass-btn",
        link:
          "bg-transparent text-link border-transparent hover:underline underline-offset-4 p-0",
        apple:
          "bg-primary text-primary-foreground border border-primary/20 hover:bg-primary/90 shadow-gu-btn",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px] rounded-lg",
        md: "h-11 px-5 rounded-xl",
        lg: "h-12 px-7 rounded-xl text-[16px]",
        xl: "h-14 px-8 rounded-2xl text-[17px]",
        icon: "h-10 w-10 rounded-xl p-0",
        "icon-sm": "h-8 w-8 rounded-lg p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  glow?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, glow, ...props }, ref) => {
    return (
      <>
        <button
          className={cn(
            buttonVariants({ variant, size, className }),
            glow ? "opacity-80" : ""
          )}
          ref={ref}
          {...props}
        />
      </>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
