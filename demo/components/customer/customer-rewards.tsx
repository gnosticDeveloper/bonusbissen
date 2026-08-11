'use client'

import { useState } from 'react'
import { Check, Copy, Gift, Lock, Ticket } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/toast'
import { formatPoints } from '@/lib/format'
import { claimReward } from '@/lib/store'
import type { Customer, Reward, Redemption } from '@/lib/types'
import { cn } from '@/lib/utils'

export function CustomerRewards({
  customer,
  rewards,
}: {
  customer: Customer
  rewards: Reward[]
}) {
  const notify = useToast()
  const [confirming, setConfirming] = useState<Reward | null>(null)
  const [claimed, setClaimed] = useState<{ redemption: Redemption; reward: Reward } | null>(null)
  const [copied, setCopied] = useState(false)

  const sorted = [...rewards].sort((a, b) => a.pointsRequired - b.pointsRequired)

  function doClaim(reward: Reward) {
    const redemption = claimReward({ customerId: customer.id, rewardId: reward.id })
    setConfirming(null)
    if (!redemption) {
      notify('No tenés puntos suficientes para este premio.', 'error')
      return
    }
    setClaimed({ redemption, reward })
    notify('¡Premio canjeado! Mostrá el código en el local.', 'success')
  }

  async function copyCode() {
    if (!claimed) return
    try {
      await navigator.clipboard.writeText(claimed.redemption.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      notify('No se pudo copiar el código.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-foreground">Premios</h2>
          <p className="text-sm text-muted-foreground">
            Tenés {formatPoints(customer.points)} puntos para canjear.
          </p>
        </div>
        <Gift className="size-6 text-primary" />
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground sm:py-10">
            Todavía no hay premios disponibles. Volvé pronto.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((reward) => {
            const canClaim = customer.points >= reward.pointsRequired
            const missing = reward.pointsRequired - customer.points
            return (
              <li key={reward.id}>
                <Card className={cn(!canClaim && 'opacity-80')}>
                  <CardContent className="flex gap-3 p-3 sm:p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={reward.imageUrl || '/placeholder.svg'}
                      alt={reward.title}
                      className="size-24 shrink-0 rounded-lg border border-border object-cover"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-tight text-foreground">
                          {reward.title}
                        </h3>
                        <Badge tone="primary">{reward.discountValue}</Badge>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                        {reward.description}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatPoints(reward.pointsRequired)} pts
                        </span>
                        {canClaim ? (
                          <Button size="sm" onClick={() => setConfirming(reward)}>
                            <Ticket className="size-3.5" /> Canjear
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Lock className="size-3.5" /> Faltan {formatPoints(missing)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {/* Confirm claim */}
      <Modal
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title="Confirmar canje"
        description={confirming ? `Se descontarán ${formatPoints(confirming.pointsRequired)} puntos de tu cuenta.` : ''}
      >
        {confirming ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={confirming.imageUrl || '/placeholder.svg'}
                alt={confirming.title}
                className="size-14 rounded-lg border border-border object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">{confirming.title}</p>
                <p className="text-xs text-muted-foreground">{confirming.discountValue}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Después de canjear, mostrá el código generado al personal del local para validarlo.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(null)}>
                Cancelar
              </Button>
              <Button onClick={() => doClaim(confirming)}>Confirmar canje</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Claimed: show code */}
      <Modal
        open={!!claimed}
        onClose={() => setClaimed(null)}
        title="¡Canje exitoso!"
        description="Presentá este código en el local para validar tu premio."
      >
        {claimed ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="size-7" />
            </div>
            <p className="text-center text-sm font-medium text-foreground">{claimed.reward.title}</p>
            <button
              onClick={copyCode}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-4 font-mono text-2xl font-bold tracking-widest text-primary transition-colors hover:bg-primary/10"
            >
              {claimed.redemption.code}
              {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              {copied ? 'Código copiado' : 'Tocá el código para copiarlo'}
            </p>
            <Button className="w-full" onClick={() => setClaimed(null)}>
              Listo
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
