"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { AdminUserInfo, UserRole } from "@/lib/definitions";
import { signOut } from "@/app/d/[slug]/actions";
import Link from "next/link";

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Administrador",
  [UserRole.CASHIER]: "Cajero",
  [UserRole.USER]: "Usuario",
};

type UserMenuProps = {
  user: AdminUserInfo | null;
  slug: string;
};

export function UserMenu({ user, slug }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();
  const displayName = user?.name ?? user?.username ?? "Usuario";
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
      <Link href={`/d/${slug}/perfil`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-foreground">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          <p className="truncate text-xs text-foreground">{user ? ROLE_LABELS[user.role.toUpperCase() as UserRole] : "—"}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => startTransition(async () => await signOut())}
        disabled={isPending}
        aria-label="Cerrar sesión"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground/80 transition-colors hover:bg-foreground/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"
      >
        {isPending ? (
          <span className="size-4 animate-spin rounded-full border-2 border-foreground/60 border-t-transparent motion-reduce:animate-none" />
        ) : (
          <LogOut className="size-4" />
        )}
      </button>
    </div>
  );
}
