import { cookies } from "next/headers";
import { getPendingExchangesCount } from "@/app/(employees)/actions";
import Sidebar from "@/components/sidebar";
import { AuthProvider, EmployeeUser } from "@/providers/auth-provider";
import { decodeEmployeePayload } from "@/lib/session";

export default async function EmployeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get("employee_token")?.value;
  const payload = token ? decodeEmployeePayload(token) : null;
  const user = payload ? { name: payload.sub, role: payload.role, id: payload.id } as EmployeeUser : null;
  const pendingCount = await getPendingExchangesCount();

  return (
    <AuthProvider context={{user, type: "employee"}}>
      <div className="flex min-h-screen min-w-341.5">
        <Sidebar hasPendings={pendingCount > 0} />
        <main className="flex-1 ml-72 p-10">{children}</main>
      </div>
    </AuthProvider>
  );
}
