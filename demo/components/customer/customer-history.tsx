'use client'

import { useMemo } from 'react'
import { ArrowDownRight, ArrowUpRight, Ticket } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatPoints, redemptionStatusLabel } from '@/lib/format'
import type { Customer, PointAction, Redemption, Reward } from '@/lib/types'

type Item =
  | { kind: 'points'; at: string; action: PointAction }
  | { kind: 'redemption'; at: string; redemption: Redemption; reward: Reward | undefined }

export function CustomerHistory({
  customer,
  actions,
  redemptions,
  rewards,
}: {
  customer: Customer
  actions: PointAction[]
  redemptions: Redemption[]
  rewards: Reward[]
}) {
  const items = useMemo<Item[]>(() => {
    const pts: Item[] = actions
      .filter((a) => a.customerId === customer.id)
      .map((a) => ({ kind: 'points', at: a.createdAt, action: a }))
    const reds: Item[] = redemptions
      .filter((r) => r.customerId === customer.id)
      .map((r) => ({
        kind: 'redemption',
        at: r.claimedAt,
        redemption: r,
        reward: rewards.find((x) => x.id === r.rewardId),
      }))
    return [...pts, ...reds].sort((a, b) => +new Date(b.at) - +new Date(a.at))
  }, [actions, redemptions, rewards, customer.id])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-xl font-semibold text-foreground">Historial</h2>
        <p className="text-sm text-muted-foreground">Tus movimientos de puntos y canjes.</p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground sm:py-10">
            Todavía no tenés movimientos registrados.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((item, i) => {
            if (item.kind === 'points') {
              const positive = item.action.amount >= 0
              return (
                <li key={`p-${item.action.id}-${i}`}>
                  <Card>
                    <CardContent className="flex items-center gap-3 p-3 sm:p-3">
                      <div
                        className={
                          positive
                            ? 'flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success'
                            : 'flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive'
                        }
                      >
                        {positive ? (
                          <ArrowUpRight className="size-4" />
                        ) : (
                          <ArrowDownRight className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {item.action.note || (positive ? 'Puntos sumados' : 'Puntos ajustados')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(item.action.createdAt)}
                        </p>
                      </div>
                      <span
                        className={
                          positive
                            ? 'text-sm font-semibold text-success'
                            : 'text-sm font-semibold text-destructive'
                        }
                      >
                        {positive ? '+' : ''}
                        {formatPoints(item.action.amount)}
                      </span>
                    </CardContent>
                  </Card>
                </li>
              )
            }
            const r = item.redemption
            const tone =
              r.status === 'confirmed' ? 'success' : r.status === 'cancelled' ? 'destructive' : 'warning'
            return (
              <li key={`r-${r.id}-${i}`}>
                <Card>
                  <CardContent className="flex items-center gap-3 p-3 sm:p-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Ticket className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Canje · {item.reward?.title ?? 'Premio'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(r.claimedAt)} · <span className="font-mono">{r.code}</span>
                      </p>
                    </div>
                    <Badge tone={tone}>{redemptionStatusLabel(r.status)}</Badge>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
