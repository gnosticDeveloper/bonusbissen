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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <UserRound size={20} />
            )}
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
