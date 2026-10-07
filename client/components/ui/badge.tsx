import { cn } from '@/lib/helpers/utils'
import type { HTMLAttributes } from 'react'

type Tone = 'neutral' | 'success' | 'warning' | 'destructive' | 'primary'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-foreground/10 text-foreground',
  success: 'bg-green-400 text-green-950',
  warning: 'bg-amber-400 text-amber-950',
  destructive: 'bg-red-400 text-red-950',
  primary: 'bg-primary text-primary-foreground',
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
