import { cn } from '@/lib/helpers/utils'
import type { HTMLAttributes } from 'react'

type Tone = 'neutral' | 'success' | 'warning' | 'destructive' | 'primary'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-foreground/10 text-foreground',
  success: 'bg-green-500/20 text-foreground',
  warning: 'bg-amber-500/20 text-foreground',
  destructive: 'bg-red-500/20 text-foreground',
  primary: 'bg-primary/20 text-foreground',
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
