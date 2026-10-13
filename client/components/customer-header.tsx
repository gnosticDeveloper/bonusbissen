"use client";

import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { useUser } from "@/providers/user-provider";

export function CustomerHeader({ authenticated = true }: { authenticated?: boolean }) {
  const user = useUser();

  return (
    <header className="relative z-10 mx-auto mb-6.5 flex w-full max-w-107.5 items-center justify-between px-5 pt-6">
      {authenticated ? (
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--primary)]">
            <UserRound size={17} aria-hidden="true" />
          </div>
          <div>
            <span className="mb-1 block text-[10px] font-bold tracking-[0.08em] text-foreground/80 uppercase">Buen día</span>
            <strong className="block text-sm tracking-[-0.2px] text-foreground">{user?.name ?? "Tu cuenta"}</strong>
          </div>
        </div>
      ) : (
        <BrandLockup size="sm" />
      )}

      {!authenticated && (
        <Link
          href="/sign-in"
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Ingresar
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
    </header>
  );
}
