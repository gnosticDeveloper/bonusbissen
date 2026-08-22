"use client";

import { createContext, useContext, useState } from "react";

type MobileDrawerContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

// Default null (no un objeto con no-ops) para que el chequeo en
// useMobileDrawer() efectivamente detecte un uso fuera del provider,
// en vez de devolver funciones silenciosas que no hacen nada.
const MobileDrawerContext = createContext<MobileDrawerContextType | null>(null);

export function useMobileDrawer() {
  const context = useContext(MobileDrawerContext);
  if (!context) {
    throw new Error("useMobileDrawer debe usarse dentro de un MobileDrawerProvider");
  }
  return context;
}

export function MobileDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);
  const open = () => setIsOpen(true);

  return <MobileDrawerContext.Provider value={{ isOpen, close, open }}>{children}</MobileDrawerContext.Provider>;
}
