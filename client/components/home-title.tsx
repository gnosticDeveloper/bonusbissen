"use client";

import { useAuth } from "@/providers/auth-provider";

export default function HomeTitle() {
  const user = useAuth();

  if (!user) return <h2 className="text-4xl text-ink">Hola de nuevo</h2>;

  const username = user.type === "employee" ? user.user?.name : null;

  return <h2 className="text-4xl text-ink">Hola de nuevo {username ? `, ${username}` : null}</h2>;
}
