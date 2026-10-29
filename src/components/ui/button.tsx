import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// The pop (design system): a 4px Canopy edge that the button sinks onto when pressed.
const pop =
  "shadow-pop active:not-aria-[haspopup]:shadow-pop-sm motion-safe:active:not-aria-[haspopup]:translate-y-0.5"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border-2 border-transparent bg-clip-padding text-base font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Hover darkens toward Canopy: fading to 80% over Sand would drop white text to 4.3:1.
        default: `border-primary bg-primary text-primary-foreground hover:border-[color-mix(in_oklch,var(--primary),var(--color-brand-deep)_15%)] hover:bg-[color-mix(in_oklch,var(--primary),var(--color-brand-deep)_15%)] ${pop}`,
        outline: `border-brand-deep bg-background text-foreground hover:bg-accent aria-expanded:bg-accent ${pop}`,
        secondary: `border-brand-deep bg-secondary text-secondary-foreground hover:bg-accent aria-expanded:bg-accent ${pop}`,
        ghost: "hover:bg-card hover:text-foreground aria-expanded:bg-card aria-expanded:text-foreground",
        destructive: `border-destructive bg-destructive text-surface hover:border-[color-mix(in_oklch,var(--destructive),var(--color-brand-deep)_15%)] hover:bg-[color-mix(in_oklch,var(--destructive),var(--color-brand-deep)_15%)] ${pop}`,
        link: "text-primary underline-offset-4 hover:underline",
      },
      // Every size is at least 44px tall: tap targets must be >= 44px (docs/SPEC.md section 7).
      size: {
        default:
          "h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-12 gap-2 px-5 text-lg has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-11",
        "icon-lg": "size-12",
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
