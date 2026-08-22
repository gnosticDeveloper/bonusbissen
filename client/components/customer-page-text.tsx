"use client";

import { useEmployeeAuth } from "@/providers/auth-provider";

export const PageText = () => {
  const user = useEmployeeAuth();

  return (
    <p className="text-sm text-muted-foreground">
      {user?.role === "ADMIN" ? "Gestioná la información de tus clientes." : "Consultá y creá clientes. La edición y baja están reservadas al dueño."}
    </p>
  );
};
