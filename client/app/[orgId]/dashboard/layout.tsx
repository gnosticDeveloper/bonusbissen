import { AdminShell } from "@/components/admin-shell";
import { AuthProvider, EmployeeRole } from "@/providers/auth-provider";
// TODO: importar la función real de sesión cuando exista, ej:
// import { getEmployeeSession } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // TODO: reemplazar por la lectura/verificación real de la cookie
  // `employee_token` (server-side) una vez que el back tenga multi-tenant.
  // Si no hay sesión válida, acá debería ir un redirect() a /sign-in.
  const session = {
    id: "temp",
    name: "HARDCODED NAME",
    role: EmployeeRole.ADMIN,
  };

  // TODO: traer el valor real desde el back cuando esté disponible por org.
  const hasPendings = false;

  return (
    <AuthProvider context={{ type: "employee", user: session }}>
      <AdminShell orgId={orgId} hasPendings={hasPendings}>
        {children}
      </AdminShell>
    </AuthProvider>
  );
}
