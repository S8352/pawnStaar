import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
  Every variant states BOTH its surface and its text colour, and no variant
  assumes the page behind it is light.

  This is the fix for the white-on-white "Start Free" button: `outline`
  previously set `bg-background` (pure white in light mode) while call sites
  added `text-white` on top of a dark section. It now inherits its
  surroundings — transparent fill, border and label taken from currentColor —
  so it is correct on any background without a call site overriding anything.

  `onDark` is for controls sitting on photography or a fixed dark band, where
  inheriting is not enough because the parent's text colour is unknown.
*/
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap micro-label ring-offset-background transition-colors duration-200 ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Brand fill. Always pairs gold with its guaranteed-legible foreground.
        default: "bg-gold text-gold-foreground hover:bg-gold/90",
        // High-contrast neutral — black on light, cream on dark.
        solid: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-current bg-transparent text-inherit hover:bg-foreground hover:text-background",
        // For controls on imagery or any always-dark band. Currently unused —
        // every surface follows the theme — but kept for the hero's eventual
        // photography, where inheriting is not enough because the colour behind
        // the control is an image rather than a token.
        onDark:
          "border border-white/70 bg-transparent text-white hover:bg-white hover:text-[hsl(220_17%_7%)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // Inherits rather than asserting `text-foreground`: ghost buttons sit
        // inside containers that set their own colour (the navbar's dark band,
        // for one), and forcing the page foreground made them vanish there.
        ghost: "text-inherit hover:bg-accent hover:text-accent-foreground",
        link: "text-gold-text underline-offset-4 hover:underline",
      },
      size: {
        // 44px floor: the minimum comfortable touch target.
        default: "h-11 px-6 py-3",
        sm: "h-11 px-4",
        lg: "h-14 px-10",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
