"use client";

import { createContext, useContext } from "react";

export enum EmployeeRole {
  ADMIN = "ADMIN",
  CASHIER = "CASHIER",
}
export type EmployeeUser = { name: string; role: EmployeeRole, id: string } | null;

export type CustomerUser = { id: string } | null;


type AuthContextType = {
  user: EmployeeUser;
  type: "employee";
} | {
  user: CustomerUser;
  type: "customer";
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
  context,
}: {
  children: React.ReactNode;
  context: AuthContextType;
}) {
  return <AuthContext.Provider value={context}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
