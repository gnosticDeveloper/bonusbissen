'use client'

import { useToast } from '@/components/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError, Input, Label, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  formatDateTime,
  formatPoints,
  parsePositiveInt,
  pointActionLabel,
  sanitizeText,
} from '@/lib/format'
import { editPointAction, grantPoints, removePointAction } from '@/lib/store'
import type { AdminUser, Customer, PointAction } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useStoreData } from '@/lib/use-store'
import { Coins, HandCoins, Pencil, Trash2, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CustomerAutocomplete } from './customer-autocomplete'

const POINTS_PER_CURRENCY = 100 // 1 punto por cada $100 gastados
const MAX_SPEND = 10_000_000
const MAX_POINTS = 1_000_000

export function PointsAdmin({ user }: { user: AdminUser }) {
  const { customers, pointActions } = useStoreData()
  const notify = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<'spend' | 'manual'>('spend')
  const [spend, setSpend] = useState('')
  const [manual, setManual] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selected = customers.find((c) => c.id === selectedId) ?? null
  const computedFromSpend = useMemo(() => {
    const n = parsePositiveInt(spend, { max: MAX_SPEND })
    return n ? Math.floor(n / POINTS_PER_CURRENCY) : 0
  }, [spend])

  const [editing, setEditing] = useState<PointAction | null>(null)
  const [removing, setRemoving] = useState<PointAction | null>(null)

  function resetForm() {
    setSpend('')
    setManual('')
    setNote('')
    setError(null)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selected) {
      setError('Primero seleccioná un cliente para asignarle puntos.')
      return
    }
    if (mode === 'spend') {
      const amount = parsePositiveInt(spend, { max: MAX_SPEND })
      if (amount == null) {
        setError('Ingresá un monto gastado válido (número mayor a 0, sin decimales).')
        return
      }
      const points = Math.floor(amount / POINTS_PER_CURRENCY)
      if (points <= 0) {
        setError(`El monto es muy bajo para sumar puntos (mínimo $${POINTS_PER_CURRENCY}).`)
        return
      }
      grantPoints({
        customerId: selected.id,
        amount: points,
        type: 'add',
        note: note.trim() ? sanitizeText(note) : `Consumo de $${formatPoints(amount)}`,
        byUserId: user.id,
        byUserName: user.name,
      })
      notify(`Se sumaron ${formatPoints(points)} puntos a ${selected.name}.`)
    } else {
      const points = parsePositiveInt(manual, { max: MAX_POINTS })
      if (points == null) {
        setError('Ingresá una cantidad de puntos válida (número entero mayor a 0).')
        return
      }
      grantPoints({
        customerId: selected.id,
        amount: points,
        type: 'add',
        note: note.trim() ? sanitizeText(note) : 'Puntos manuales',
        byUserId: user.id,
        byUserName: user.name,
      })
      notify(`Se sumaron ${formatPoints(points)} puntos a ${selected.name}.`)
    }
    resetForm()
  }

  const visibleActions = useMemo(() => {
    const list = selected
      ? pointActions.filter((a) => a.customerId === selected.id)
      : pointActions
    return [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }, [pointActions, selected])

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-4 text-primary" /> Otorgar puntos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Cliente</Label>
              <CustomerAutocomplete
                customers={customers}
                selected={selected}
                onSelect={(c) => setSelectedId(c.id)}
                onClear={() => setSelectedId(null)}
              />
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode('spend')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                  mode === 'spend'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Wallet className="size-4" /> Por monto
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                  mode === 'manual'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <HandCoins className="size-4" /> Puntos manuales
              </button>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
              {mode === 'spend' ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="spend">Monto gastado ($)</Label>
                  <Input
                    id="spend"
                    inputMode="numeric"
                    placeholder="Ej: 12000"
                    value={spend}
                    onChange={(e) => setSpend(e.target.value.replace(/[^\d]/g, ''))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Conversión: 1 punto por cada ${POINTS_PER_CURRENCY}. Sumará{' '}
                    <span className="font-semibold text-primary">
                      {formatPoints(computedFromSpend)} puntos
                    </span>
                    .
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manual">Puntos a sumar</Label>
                  <Input
                    id="manual"
                    inputMode="numeric"
                    placeholder="Ej: 100"
                    value={manual}
                    onChange={(e) => setManual(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">Nota (opcional)</Label>
                <Input
                  id="note"
                  maxLength={120}
                  placeholder="Detalle del movimiento"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <FieldError message={error} />
              <Button type="submit" className="w-full" disabled={!selected}>
                Sumar puntos
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card className="flex h-full flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>
              Historial de movimientos
              {selected ? (
                <span className="ml-1 font-normal text-muted-foreground">· {selected.name}</span>
              ) : null}
            </CardTitle>
            <Badge tone="neutral">{visibleActions.length}</Badge>
          </CardHeader>
          <CardContent className="flex-1">
            {visibleActions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {selected
                  ? 'Este cliente todavía no tiene movimientos de puntos.'
                  : 'Todavía no hay movimientos de puntos registrados.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visibleActions.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/60 p-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{a.customerName}</span>
                        <Badge tone={a.amount >= 0 ? 'success' : 'destructive'}>
                          {a.amount >= 0 ? '+' : ''}
                          {formatPoints(a.amount)} pts
                        </Badge>
                        <span className="text-xs text-muted-foreground">{pointActionLabel(a.type)}</span>
                      </div>
                      {a.note ? <span className="text-xs text-muted-foreground">{a.note}</span> : null}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(a.createdAt)} · por {a.byUserName}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar movimiento"
                        onClick={() => setEditing(a)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Eliminar movimiento"
                        onClick={() => setRemoving(a)}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {editing ? (
        <EditActionModal
          action={editing}
          user={user}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null)
            notify(msg)
          }}
        />
      ) : null}

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Eliminar movimiento de puntos"
        description="Se revertirá el efecto de este movimiento sobre el saldo del cliente."
      >
        {removing ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              ¿Seguro que querés eliminar el movimiento de{' '}
              <span className="font-semibold text-foreground">
                {removing.amount >= 0 ? '+' : ''}
                {formatPoints(removing.amount)} puntos
              </span>{' '}
              de {removing.customerName}?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRemoving(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  removePointAction(removing.id)
                  notify('Movimiento eliminado y saldo corregido.')
                  setRemoving(null)
                }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function EditActionModal({
  action,
  user,
  onClose,
  onSaved,
}: {
  action: PointAction
  user: AdminUser
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const isNegative = action.amount < 0
  const [amount, setAmount] = useState(String(Math.abs(action.amount)))
  const [note, setNote] = useState(action.note)
  const [error, setError] = useState<string | null>(null)

  function save() {
    setError(null)
    const n = parsePositiveInt(amount, { max: MAX_POINTS })
    if (n == null) {
      setError('Ingresá una cantidad de puntos válida (entero mayor a 0).')
      return
    }
    editPointAction({
      actionId: action.id,
      newAmount: isNegative ? -n : n,
      note: note.trim() ? sanitizeText(note) : action.note,
      byUserId: user.id,
      byUserName: user.name,
    })
    onSaved('Movimiento actualizado y saldo recalculado.')
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar movimiento de puntos"
      description={`Cliente: ${action.customerName}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-amount">
            Cantidad de puntos {isNegative ? '(se aplicará como resta)' : ''}
          </Label>
          <Input
            id="edit-amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-note">Nota</Label>
          <Textarea
            id="edit-note"
            maxLength={160}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <FieldError message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>Guardar cambios</Button>
        </div>
      </div>
    </Modal>
  )
}
