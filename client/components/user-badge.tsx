import { Badge } from "./ui/badge";
import { use } from "react";

export function UserBadge({userPromise}: {userPromise: Promise<{
    name: string;
    roleLabel: string;
}> }) {
  const user = use(userPromise);

  return (
    <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
      <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
        {user?.name?.charAt(0) ?? "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{user?.name ?? "Invitado"}</p>
        {user && <Badge tone={user.roleLabel === "Dueño" ? "primary" : "neutral"}>{user.roleLabel}</Badge>}
      </div>
    </div>
  );
}
