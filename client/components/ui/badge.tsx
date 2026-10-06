import { cn } from '@/lib/helpers/utils'
import type { HTMLAttributes } from 'react'

type Tone = 'neutral' | 'success' | 'warning' | 'destructive' | 'primary'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-muted text-muted',
  success: 'bg-green-500/15 text-green-500',
  warning: 'bg-amber-500/20 text-amber-500',
  destructive: 'bg-red-500/15 text-red-500',
  primary: 'bg-primary/15 text-primary',
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
