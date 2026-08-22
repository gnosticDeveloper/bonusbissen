"use client";

import { createContext, useContext } from "react";

export enum EmployeeRole {
  ADMIN = "ADMIN",
  CASHIER = "CASHIER",
}
export type EmployeeUser = { name: string; role: EmployeeRole; id: string } | null;

export type CustomerUser = { id: string } | null;

type AuthContextType =
  | {
      user: EmployeeUser;
      type: "employee";
    }
  | {
      user: CustomerUser;
      type: "customer";
    };

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children, context }: { children: React.ReactNode; context: AuthContextType }) {
  return <AuthContext.Provider value={context}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

// Narrowing automático para componentes que viven exclusivamente dentro
// del panel de empleados (admin/cajero). Evita repetir el chequeo
// `ctx.type !== "employee"` en cada componente del panel.
export function useEmployeeAuth() {
  const ctx = useAuth();
  if (!ctx || ctx.type !== "employee") {
    throw new Error("useEmployeeAuth debe usarse dentro de un AuthProvider de tipo 'employee'.");
  }
  return ctx.user;
}
