'use client'

import { useState } from 'react'
import { Building2, Clock, MapPin, Save, Type } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/toast'
import { updateOrganization } from '@/lib/store'
import type { Organization } from '@/lib/types'

export function OrganizationSettings({ organization }: { organization: Organization }) {
  const toast = useToast()
  const [form, setForm] = useState<Organization>(organization)

  function set<K extends keyof Organization>(key: K, value: Organization[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast('El nombre del negocio es obligatorio', 'error')
      return
    }
    updateOrganization({
      name: form.name.trim(),
      icon: form.icon.trim(),
      hours: form.hours.trim(),
      address: form.address.trim(),
      description: form.description.trim(),
    })
    toast('Datos del negocio actualizados', 'success')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Datos del negocio</h2>
            <p className="text-sm text-muted-foreground">
              Esta información se muestra a tus clientes en la app.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid gap-5">
          <Field label="Nombre del negocio" htmlFor="org-name" required>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Café Aurora"
              icon={<Type className="size-4" />}
            />
          </Field>

          <Field label="Emoji o icono" htmlFor="org-icon" hint="Un solo emoji que represente tu marca.">
            <Input
              id="org-icon"
              value={form.icon}
              onChange={(e) => set('icon', e.target.value)}
              placeholder="☕"
              maxLength={4}
            />
          </Field>

          <Field label="Horario de atención" htmlFor="org-hours">
            <Input
              id="org-hours"
              value={form.hours}
              onChange={(e) => set('hours', e.target.value)}
              placeholder="Lun a Sáb · 8:00 - 21:00"
              icon={<Clock className="size-4" />}
            />
          </Field>

          <Field label="Dirección" htmlFor="org-address">
            <Input
              id="org-address"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Av. Siempreviva 742, Springfield"
              icon={<MapPin className="size-4" />}
            />
          </Field>

          <Field label="Descripción" htmlFor="org-desc">
            <Textarea
              id="org-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Breve descripción de tu negocio y programa de lealtad."
              rows={3}
            />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" className="gap-1.5">
              <Save className="size-4" /> Guardar cambios
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
