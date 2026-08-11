'use client'

import { Clock, MapPin, Sparkles, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPoints, relativeTime } from '@/lib/format'
import type { Customer, Organization, Reward, PointAction } from '@/lib/types'

export function CustomerHome({
  customer,
  organization,
  rewards,
  actions,
  onGoToRewards,
}: {
  customer: Customer
  organization: Organization
  rewards: Reward[]
  actions: PointAction[]
  onGoToRewards: () => void
}) {
  const nextReward = [...rewards]
    .filter((r) => r.pointsRequired > customer.points)
    .sort((a, b) => a.pointsRequired - b.pointsRequired)[0]

  const affordable = rewards.filter((r) => r.pointsRequired <= customer.points).length
  const lastAction = actions[0]

  const progress = nextReward
    ? Math.min(100, Math.round((customer.points / nextReward.pointsRequired) * 100))
    : 100

  return (
    <div className="flex flex-col gap-4">
      {/* Points hero */}
      <Card className="overflow-hidden border-none bg-primary text-primary-foreground shadow-md">
        <CardContent className="flex flex-col gap-4 p-5 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium opacity-80">Tus puntos</span>
            <Sparkles className="size-5 opacity-80" />
          </div>
          <div className="flex items-end gap-2">
            <span className="font-serif text-5xl font-bold leading-none tabular-nums">
              {formatPoints(customer.points)}
            </span>
            <span className="mb-1 text-sm opacity-80">puntos</span>
          </div>
          {lastAction ? (
            <p className="text-xs opacity-80">
              Último movimiento {relativeTime(lastAction.createdAt)}
            </p>
          ) : (
            <p className="text-xs opacity-80">Empezá a sumar puntos con cada compra.</p>
          )}
        </CardContent>
      </Card>

      {/* Next reward progress */}
      {nextReward ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Próximo premio</span>
              <Badge tone="primary">{nextReward.discountValue}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{nextReward.title}</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Te faltan{' '}
              <span className="font-semibold text-foreground">
                {formatPoints(nextReward.pointsRequired - customer.points)} puntos
              </span>{' '}
              para canjear este premio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 p-4 sm:p-4">
            <TrendingUp className="size-5 text-success" />
            <p className="text-sm text-foreground">
              ¡Tenés puntos suficientes para todos los premios disponibles!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick action */}
      <button
        onClick={onGoToRewards}
        className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">Ver premios disponibles</p>
          <p className="text-xs text-muted-foreground">
            {affordable > 0
              ? `Podés canjear ${affordable} ${affordable === 1 ? 'premio' : 'premios'} ahora`
              : 'Explorá el catálogo de recompensas'}
          </p>
        </div>
        <Badge tone={affordable > 0 ? 'success' : 'neutral'}>{affordable}</Badge>
      </button>

      {/* Business info */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:p-4">
          <p className="text-sm font-semibold text-foreground">Sobre {organization.name}</p>
          {organization.description ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {organization.description}
            </p>
          ) : null}
          {organization.hours ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0" /> {organization.hours}
            </div>
          ) : null}
          {organization.address ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" /> {organization.address}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
