"use client";

import { Reward } from "@/lib/definitions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPoints, truncate } from "@/lib/format";
import { Gift, Pencil, Trash2 } from "lucide-react";

export default function RewardsList({ rewards, isAdmin }: { rewards: Reward[]; isAdmin: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rewards.map((r) => (
        <Card key={r.id} className="flex flex-col overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.imagePath || "/placeholder.svg"} alt={r.title} className="h-32 w-full border-b border-border object-cover" />
          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-tight">{r.title}</h3>
              <Badge tone="primary">{r.discountValue}</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{truncate(r.description, 96)}</p>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-sm font-bold text-primary">{formatPoints(r.costPoints)} pts</span>
              {isAdmin ? (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Editar recompensa" onClick={() => {}}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Eliminar recompensa" onClick={() => {}}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      ))}
      {rewards.length === 0 ? (
        <Card className="col-span-full flex flex-col items-center gap-2 p-10 text-center">
          <Gift className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Todavía no cargaste recompensas.</p>
        </Card>
      ) : null}
    </div>
  );
}
