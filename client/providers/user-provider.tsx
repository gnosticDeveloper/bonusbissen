"use client";

import { UserInfo } from "@/lib/types/customer";
import { createContext, useContext } from "react";

const UserContext = createContext<UserInfo | null>(null);

export function UserProvider({ user, children }: { user: UserInfo | null; children: React.ReactNode }) {
  return <UserContext value={user}>{children}</UserContext>;
}

export const useUser = () => useContext(UserContext);
