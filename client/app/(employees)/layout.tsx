import { cookies } from "next/headers";
import { getPendingExchangesCount } from "@/app/(employees)/actions";
import Sidebar from "@/components/sidebar";
import { AuthProvider, EmployeeUser } from "@/providers/auth-provider";
import { decodeEmployeePayload } from "@/lib/session";

export default async function EmployeesLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("employee_token")?.value;
  const payload = token ? decodeEmployeePayload(token) : null;
  const user = payload ? ({ name: payload.username, role: payload.role, id: payload.sub } as EmployeeUser) : null;
  const pendingCount = await getPendingExchangesCount();

  return (
    <AuthProvider context={{ user, type: "employee" }}>
      <div className="flex h-screen min-w-341.5 overflow-hidden">
        <Sidebar hasPendings={pendingCount > 0} />
        <main className="flex-1 ml-72 p-10 overflow-y-auto">{children}</main>
      </div>
    </AuthProvider>
  );
}
