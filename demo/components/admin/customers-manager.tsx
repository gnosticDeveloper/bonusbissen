'use client'

import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  formatDate,
  formatPoints,
  parsePositiveInt,
  sanitizeText,
  validateName,
  validatePhone,
} from '@/lib/format'
import { addCustomer, deleteCustomer, updateCustomer } from '@/lib/store'
import type { AdminUser, Customer } from '@/lib/types'
import { useStoreData } from '@/lib/use-store'
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

export function CustomersManager({ user }: { user: AdminUser }) {
  const { customers } = useStoreData()
  const notify = useToast()
  const isAdmin = user.role === 'ADMIN'
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [removing, setRemoving] = useState<Customer | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    const list = !q
      ? customers
      : customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (digits.length > 0 && c.phone.replace(/\D/g, '').includes(digits)),
        )
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [customers, query])

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? 'Gestioná la información de tus clientes.'
              : 'Consultá y creá clientes. La edición y baja están reservadas al dueño.'}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Nuevo cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre o teléfono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Card className="flex-1 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Users className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {query ? 'No hay clientes que coincidan con la búsqueda.' : 'Todavía no hay clientes.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3 sm:px-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {c.name
                    .split(' ')
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{c.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {c.phone} · alta {formatDate(c.createdAt)}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-primary">{formatPoints(c.points)}</span>
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                    puntos
                  </span>
                </div>
                {isAdmin ? (
                  <div className="ml-1 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar cliente"
                      onClick={() => setEditing(c)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Dar de baja cliente"
                      onClick={() => setRemoving(c)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {(creating || editing) ? (
        <CustomerForm
          customer={editing}
          allowPoints={!editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={(msg) => {
            setCreating(false)
            setEditing(null)
            notify(msg)
          }}
        />
      ) : null}

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Dar de baja cliente"
        description="Se eliminará el cliente de la lista. Sus canjes previos quedarán registrados."
      >
        {removing ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              ¿Seguro que querés dar de baja a{' '}
              <span className="font-semibold text-foreground">{removing.name}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRemoving(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteCustomer(removing.id)
                  notify('Cliente dado de baja.')
                  setRemoving(null)
                }}
              >
                Dar de baja
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function CustomerForm({
  customer,
  allowPoints,
  onClose,
  onSaved,
}: {
  customer: Customer | null
  allowPoints: boolean
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [points, setPoints] = useState('')
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  function save() {
    const next: Record<string, string | null> = {
      name: validateName(name),
      phone: validatePhone(phone),
      points:
        allowPoints && points.trim() && parsePositiveInt(points) == null
          ? 'Los puntos iniciales deben ser un número entero mayor a 0 (o dejalo vacío).'
          : null,
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    if (customer) {
      updateCustomer(customer.id, { name: sanitizeText(name), phone: phone.trim() })
      onSaved('Cliente actualizado.')
    } else {
      const initial = allowPoints && points.trim() ? parsePositiveInt(points)! : 0
      addCustomer({ name: sanitizeText(name), phone: phone.trim(), points: initial })
      onSaved('Cliente creado.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={customer ? 'Editar cliente' : 'Nuevo cliente'}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-name">Nombre y apellido</Label>
          <Input
            id="c-name"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Sofía Ramírez"
          />
          <FieldError message={errors.name} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-phone">Teléfono</Label>
          <Input
            id="c-phone"
            inputMode="tel"
            maxLength={20}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: +54 11 5512-3344"
          />
          <FieldError message={errors.phone} />
        </div>
        {allowPoints ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-points">Puntos iniciales (opcional)</Label>
            <Input
              id="c-points"
              inputMode="numeric"
              value={points}
              onChange={(e) => setPoints(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="0"
            />
            <FieldError message={errors.points} />
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>{customer ? 'Guardar cambios' : 'Crear cliente'}</Button>
        </div>
      </div>
    </Modal>
  )
}
