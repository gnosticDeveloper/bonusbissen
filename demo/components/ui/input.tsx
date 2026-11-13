import { cn } from '@/lib/helpers/utils'
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
}

export function Input({ className, icon, ...props }: InputProps) {
  const control = (
    <input
      className={cn(
        'flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors',
        'placeholder:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:border-primary',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-red-500/30',
        icon && 'pl-9',
        className,
      )}
      {...props}
    />
  )
  if (!icon) return control
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/80">
        {icon}
      </span>
      {control}
    </div>
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors leading-relaxed',
        'placeholder:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:border-primary',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-red-500/30',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-sm font-medium text-foreground', className)} {...props} />
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-foreground">{message}</p>
}

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string | null
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-foreground/80">{hint}</p>}
      <FieldError message={error} />
    </div>
  )
}
