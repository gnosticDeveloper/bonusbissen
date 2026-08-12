/* ---------- relative time (in Spanish) ---------- */

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = now - then
  const future = diffMs < 0
  const abs = Math.abs(diffMs)

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  const prefix = future ? 'en ' : 'hace '

  if (abs < minute) return future ? 'en instantes' : 'hace instantes'
  if (abs < hour) {
    const m = Math.round(abs / minute)
    return `${prefix}${m} ${m === 1 ? 'minuto' : 'minutos'}`
  }
  if (abs < day) {
    const h = Math.round(abs / hour)
    return `${prefix}${h} ${h === 1 ? 'hora' : 'horas'}`
  }
  const d = Math.round(abs / day)
  if (d < 30) return `${prefix}${d} ${d === 1 ? 'día' : 'días'}`
  const months = Math.round(d / 30)
  if (months < 12) return `${prefix}${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.round(months / 12)
  return `${prefix}${years} ${years === 1 ? 'año' : 'años'}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatPoints(points: number): string {
  return points.toLocaleString('es-AR')
}

/* ---------- validation / sanitization ---------- */

export const MAX_NAME_LENGTH = 60
export const MAX_TEXT_LENGTH = 280
export const MAX_TITLE_LENGTH = 60

export function sanitizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function validateName(value: string): string | null {
  const v = sanitizeText(value)
  if (!v) return 'El nombre no puede estar vacío.'
  if (v.length < 2) return 'El nombre debe tener al menos 2 caracteres.'
  if (v.length > MAX_NAME_LENGTH) return `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres.`
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(v)) return 'Ingresá un nombre válido, con letras.'
  return null
}

/** Accepts digits, spaces, +, -, parentheses. Requires 8–15 digits. */
export function validatePhone(value: string): string | null {
  const v = value.trim()
  if (!v) return 'El teléfono no puede estar vacío.'
  if (!/^[\d\s+()-]+$/.test(v)) return 'El teléfono solo puede tener números, espacios y los signos + ( ) -.'
  const digits = v.replace(/\D/g, '')
  if (digits.length < 8) return 'El teléfono es demasiado corto. Revisá que tenga el código de área.'
  if (digits.length > 15) return 'El teléfono es demasiado largo. Ingresá un número válido.'
  return null
}

/** Parses a positive integer string. Returns null if invalid. */
export function parsePositiveInt(value: string, opts?: { max?: number }): number | null {
  const v = value.trim()
  if (!/^\d+$/.test(v)) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  if (opts?.max != null && n > opts.max) return null
  return n
}

export function validateRequired(value: string, label: string, maxLength = MAX_TEXT_LENGTH): string | null {
  const v = sanitizeText(value)
  if (!v) return `${label} no puede estar vacío.`
  if (v.length > maxLength) return `${label} no puede superar los ${maxLength} caracteres.`
  return null
}

export function truncate(value: string, length: number): string {
  if (value.length <= length) return value
  return value.slice(0, length).trimEnd() + '…'
}

/* ---------- status labels ---------- */

export function redemptionStatusLabel(status: 'pending' | 'confirmed' | 'cancelled'): string {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'confirmed':
      return 'Confirmado'
    case 'cancelled':
      return 'Anulado'
  }
}

export function pointActionLabel(type: 'add' | 'subtract' | 'edit' | 'remove'): string {
  switch (type) {
    case 'add':
      return 'Suma de puntos'
    case 'subtract':
      return 'Resta de puntos'
    case 'edit':
      return 'Modificación'
    case 'remove':
      return 'Eliminación'
  }
}
