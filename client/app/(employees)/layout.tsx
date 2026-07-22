import { cookies } from "next/headers";
import { getPendingExchangesCount } from "@/app/(employees)/actions";
import EmployeeShell from "@/components/employee-shell";
import { AuthProvider, EmployeeUser } from "@/providers/auth-provider";
import { decodeEmployeePayload } from "@/lib/session";

export default async function EmployeesLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("employee_token")?.value;
  const payload = token ? decodeEmployeePayload(token) : null;
  const user = payload ? ({ name: payload.username, role: payload.role, id: payload.sub } as EmployeeUser) : null;
  const pendingCount = await getPendingExchangesCount();

  return (
    <AuthProvider context={{ user, type: "employee" }}>
      <EmployeeShell hasPendings={pendingCount > 0}>{children}</EmployeeShell>
    </AuthProvider>
  );
}
