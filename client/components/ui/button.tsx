import type { ComponentProps } from 'react'

import { cn } from '@/lib/helpers/utils'

const baseClasses =
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-foreground/70 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-3 aria-invalid:ring-red-500/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

const variantClasses = {
  default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
  outline:
    'border-border bg-background text-foreground hover:bg-foreground/10 aria-expanded:bg-foreground/10',
  secondary:
    'bg-card text-foreground hover:bg-foreground/10 aria-expanded:bg-foreground/10',
  ghost:
    'text-foreground hover:bg-foreground/10 aria-expanded:bg-foreground/10',
  destructive:
    'bg-red-200 text-red-950 hover:bg-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/50',
  link: 'text-foreground underline decoration-primary underline-offset-4 hover:decoration-foreground',
} as const

const sizeClasses = {
  default:
    'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
  xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
  lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
  icon: 'size-8',
  'icon-xs':
    "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
  'icon-sm':
    'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
  'icon-lg': 'size-9',
} as const

type ButtonVariantOptions = {
  variant?: keyof typeof variantClasses | null
  size?: keyof typeof sizeClasses | null
  className?: string
}

/** Button classes for non-button elements (e.g. links styled as buttons). */
function buttonVariants({ variant, size, className }: ButtonVariantOptions = {}) {
  return cn(baseClasses, variantClasses[variant ?? 'default'], sizeClasses[size ?? 'default'], className)
}

type ButtonProps = ComponentProps<'button'> & Omit<ButtonVariantOptions, 'className'>

/** Native button; defaults to `type="button"` so it never submits a form unless asked to. */
function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  )
}

export { Button, buttonVariants }
