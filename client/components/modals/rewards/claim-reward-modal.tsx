"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Gift, X } from "lucide-react";
import type { Reward } from "@/lib/types/reward";
import { ModalDescription, ModalTitle, useModal } from "@/components/modal";
import { claimReward } from "@/app/s/[slug]/(member-only)/recompensas/actions";
import { ProgressBar } from "@/app/s/[slug]/(member-only)/_components/progress-bar";
import { Spinner } from "@/components/spinner";
import { brandColorVars } from "@/lib/helpers/color";
import { formatNumber } from "@/lib/helpers/format";
import { rewardProgress } from "@/lib/helpers/reward-progress";

const EXCHANGES_HREF = "/b/resumen";

const PRIMARY_BUTTON =
  "inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-[17px] font-bold text-brand-contrast transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/70 disabled:opacity-60";
const SECONDARY_BUTTON =
  "inline-flex h-12 w-full items-center justify-center rounded-2xl text-base font-semibold text-foreground/85 transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/70 disabled:opacity-50";
const SHEET_PADDING = "pb-[calc(1.5rem+env(safe-area-inset-bottom))]";

interface RewardClaimModalProps {
  reward: Reward;
  /** The program's point name ("puntos", "Geekcoins"…). */
  pointLabel: string;
  /** The member's balance when the sheet opened; `null` when it couldn't be read (the backend checks it on claim). */
  points: number | null;
  /** The storefront color. The modal renders outside the storefront layout, so it re-applies the brand itself. */
  brandColor?: string | null;
}

/** Opens the claim sheet for one reward of the storefront. */
export function useOpenRewardClaim({ points, pointLabel, brandColor }: Omit<RewardClaimModalProps, "reward">) {
  const { open } = useModal();

  return useCallback(
    (reward: Reward) => {
      open(<RewardClaimModal reward={reward} points={points} pointLabel={pointLabel} brandColor={brandColor} />, { variant: "sheet" });
    },
    [brandColor, open, pointLabel, points],
  );
}

type ClaimStatus =
  | { kind: "idle" }
  | { kind: "claiming" }
  | { kind: "rejected"; message: string }
  /** The request may have reached the backend: retrying could claim (and charge) twice. */
  | { kind: "unknown" }
  | { kind: "claimed"; code: string };

export function RewardClaimModal({ reward, pointLabel, points, brandColor }: RewardClaimModalProps) {
  const { close } = useModal();
  const [status, setStatus] = useState<ClaimStatus>({ kind: "idle" });

  const progress = points !== null ? rewardProgress(reward.costPoints, points) : null;
  const affordable = !progress || progress.missing === 0;
  const remaining = points !== null && affordable ? points - reward.costPoints : null;
  const claiming = status.kind === "claiming";

  const handleClaim = async () => {
    if (claiming) return;
    setStatus({ kind: "claiming" });

    try {
      const result = await claimReward(reward.id);
      if (result.ok) setStatus({ kind: "claimed", code: result.data.code });
      // Without an HTTP status the backend never answered (timeout, network, unreadable body).
      else if (result.status === undefined) setStatus({ kind: "unknown" });
      else setStatus({ kind: "rejected", message: result.error });
    } catch {
      setStatus({ kind: "unknown" });
    }
  };

  if (status.kind === "claimed") {
    return <ClaimedView code={status.code} reward={reward} remaining={remaining} pointLabel={pointLabel} brandColor={brandColor} onClose={close} />;
  }

  const image = reward.imageUrl ?? reward.imageThumbnailUrl;

  return (
    <div style={brandColorVars(brandColor)} className={`flex flex-col ${SHEET_PADDING}`}>
      <div className="relative mx-3 mt-2 sm:mt-3">
        {image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="block h-59 w-full rounded-[22px] bg-background object-cover" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[22px] bg-linear-to-b from-transparent from-55% to-black/55" />
          </>
        ) : (
          <span aria-hidden="true" className="grid h-40 w-full place-items-center rounded-[22px] bg-brand/15 text-brand-ink">
            <Gift className="size-11" strokeWidth={1.75} />
          </span>
        )}

        <button
          type="button"
          onClick={close}
          disabled={claiming}
          aria-label="Cerrar"
          className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
        >
          <X size={20} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-4.5 px-5 pt-4.5">
        <div className="flex flex-col gap-1.5">
          <ModalTitle className="text-2xl leading-tight font-bold tracking-[-0.01em] text-balance">{reward.title}</ModalTitle>
          {reward.description && <ModalDescription className="text-[15px] leading-normal text-foreground/75">{reward.description}</ModalDescription>}
        </div>

        <PointsPanel cost={reward.costPoints} points={points} pointLabel={pointLabel} title={reward.title} />

        {status.kind === "rejected" && (
          <p role="alert" className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm leading-snug text-foreground">
            {status.message}
          </p>
        )}

        {status.kind === "unknown" && (
          <p role="alert" className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm leading-snug text-foreground">
            No pudimos confirmar el canje. Antes de intentar de nuevo, revisá en{" "}
            <Link href={EXCHANGES_HREF} onClick={close} className="font-bold underline underline-offset-2">
              Mis canjes
            </Link>{" "}
            si ya se registró.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {affordable && status.kind !== "unknown" && (
            <button type="button" onClick={handleClaim} disabled={claiming} aria-busy={claiming} className={PRIMARY_BUTTON}>
              {claiming ? (
                <>
                  <Spinner />
                  Canjeando...
                </>
              ) : (
                `Canjear por ${formatNumber(reward.costPoints)} ${pointLabel}`
              )}
            </button>
          )}
          <button type="button" onClick={close} disabled={claiming} className={SECONDARY_BUTTON}>
            {affordable && status.kind !== "unknown" ? "Cancelar" : "Cerrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The cost against the balance: what the claim spends, or how far the balance still is. */
function PointsPanel({ cost, points, pointLabel, title }: { cost: number; points: number | null; pointLabel: string; title: string }) {
  if (points === null) {
    return (
      <div className="flex flex-col gap-2 rounded-[20px] bg-foreground/5 px-4.5 pt-4 pb-4.5">
        <PanelHeadline label="Cuesta" value={cost} pointLabel={pointLabel} />
        <p className="text-sm text-foreground/75">No pudimos cargar tu saldo. Lo verificamos al canjear.</p>
      </div>
    );
  }

  const { missing, percent } = rewardProgress(cost, points);

  if (missing > 0) {
    return (
      <div className="flex flex-col gap-3.5 rounded-[20px] bg-foreground/5 px-4.5 pt-4 pb-4.5">
        <PanelHeadline label="Te faltan" value={missing} pointLabel={pointLabel} />
        <ProgressBar
          percent={percent}
          label={`Progreso hacia ${title}`}
          valueText={`Tenés ${formatNumber(points)} de ${formatNumber(cost)} ${pointLabel}`}
          trackClassName="h-2.5 bg-foreground/15"
          fillClassName="bg-brand-ink"
        />
        <BalanceRow left={["Tu saldo", points]} right={["Cuesta", cost]} />
      </div>
    );
  }

  const remaining = points - cost;

  return (
    <div className="flex flex-col gap-3.5 rounded-[20px] bg-foreground/5 px-4.5 pt-4 pb-4.5">
      <PanelHeadline label="Vas a usar" value={cost} pointLabel={pointLabel} accent />
      {/* The row below says the same in words; the bar only pictures the split. */}
      <div aria-hidden="true" className="flex h-2.5 gap-0.75">
        <span className={`bg-brand-ink ${remaining > 0 ? "rounded-l-full" : "rounded-full"}`} style={{ flexGrow: cost }} />
        {remaining > 0 && <span className="rounded-r-full bg-foreground/20" style={{ flexGrow: remaining }} />}
      </div>
      <BalanceRow left={["Tu saldo", points]} right={["Te quedan", remaining]} />
    </div>
  );
}

function PanelHeadline({ label, value, pointLabel, accent = false }: { label: string; value: number; pointLabel: string; accent?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span className="text-sm font-semibold text-foreground/75">{label}</span>
      <span className="inline-flex items-baseline gap-2">
        <span className={`text-5xl leading-none font-extrabold tracking-[-0.03em] tabular-nums ${accent ? "text-brand-ink" : "text-foreground"}`}>
          {formatNumber(value)}
        </span>
        <span className="text-base font-semibold text-foreground/85">{pointLabel}</span>
      </span>
    </div>
  );
}

function BalanceRow({ left, right }: { left: [string, number]; right: [string, number] }) {
  return (
    <div className="flex justify-between gap-3 text-sm tabular-nums text-foreground/75">
      <span>
        {left[0]}: <strong className="font-bold text-foreground">{formatNumber(left[1])}</strong>
      </span>
      <span>
        {right[0]}: <strong className="font-bold text-foreground">{formatNumber(right[1])}</strong>
      </span>
    </div>
  );
}

function ClaimedView({
  code,
  reward,
  remaining,
  pointLabel,
  brandColor,
  onClose,
}: {
  code: string;
  reward: Reward;
  remaining: number | null;
  pointLabel: string;
  brandColor?: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The claim button that held focus is gone: move focus to the result so it is announced.
  useEffect(() => {
    rootRef.current?.focus();
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // si falla el clipboard, el código sigue visible para copiarlo a mano
    }
  };

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      style={brandColorVars(brandColor)}
      className={`flex flex-col items-center gap-5 px-5 pt-5 text-center outline-none sm:pt-7 ${SHEET_PADDING}`}
    >
      <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-brand/20 text-brand-ink">
        <Check size={32} strokeWidth={2.5} />
      </span>

      <div className="flex flex-col gap-1.5">
        <ModalTitle className="text-2xl leading-tight font-bold tracking-[-0.01em]">¡Canje confirmado!</ModalTitle>
        <ModalDescription className="text-[15px] leading-normal text-foreground/75">
          Mostrá este código en el local para retirar <strong className="font-bold text-foreground">{reward.title}</strong>.
        </ModalDescription>
      </div>

      <div className="flex w-full items-center justify-between gap-3 rounded-[20px] border-2 border-dashed border-border bg-foreground/5 py-2.5 pr-2.5 pl-5">
        <span className="min-w-0 text-2xl font-extrabold tracking-[0.2em] break-all text-foreground select-all">{code}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Código copiado" : "Copiar código"}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-foreground/85 transition-colors hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/70"
        >
          {copied ? <Check size={20} aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
        </button>
      </div>
      <p role="status" className="sr-only">
        {copied ? "Código copiado" : ""}
      </p>

      {remaining !== null && (
        <p className="text-sm text-foreground/75">
          Te quedan <strong className="font-bold text-foreground tabular-nums">{formatNumber(remaining)}</strong> {pointLabel}.
        </p>
      )}

      <div className="flex w-full flex-col gap-1.5">
        <button type="button" onClick={onClose} className={PRIMARY_BUTTON}>
          Listo
        </button>
        <Link href={EXCHANGES_HREF} onClick={onClose} className={SECONDARY_BUTTON}>
          Ver mis canjes
        </Link>
      </div>
    </div>
  );
}
