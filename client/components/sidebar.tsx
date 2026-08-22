"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/consts";

type SidebarProps = {
  hasPendings: boolean;
  onNavigate: VoidFunction;
  orgId: string;
};

export default function Sidebar({ hasPendings, onNavigate, orgId }: SidebarProps) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === `/${orgId}${item.url}`;
        return (
          <Link
            href={`/${orgId}${item.url}`}
            key={item.id}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
