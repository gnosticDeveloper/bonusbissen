'use client'

import { Button } from '@/components/ui/button'
import { setTheme } from '@/lib/store'
import { useTheme } from '@/lib/use-store'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Cambiar a modo ${next === 'dark' ? 'oscuro' : 'claro'}`}
      title={`Cambiar a modo ${next === 'dark' ? 'oscuro' : 'claro'}`}
      onClick={() => setTheme(next)}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
