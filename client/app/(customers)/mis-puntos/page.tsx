import EliminarPerfilButton from "@/components/mis-puntos/delete-account-button";
import MisPuntosShell from "@/components/mis-puntos/mis-puntos-shell";
import PendingsList from "@/components/mis-puntos/pendings-list";
import RewardsSection from "@/components/mis-puntos/rewards-section";
import RewardsSkeleton from "@/components/mis-puntos/rewards-squeleton";
import { Suspense } from "react";
import { getCustomerById, getPendingExchangesByCustomerId } from "../actions";
import { AuthProvider, CustomerUser } from "@/providers/auth-provider";
import { cookies } from "next/headers";
import { decodeCustomerPayload } from "@/lib/session";

export default async function MisPuntosPage() {
  const token = (await cookies()).get("customer_token")?.value;
  const payload = token ? decodeCustomerPayload(token) : null;
  const user = payload ? { id: payload.id } as CustomerUser : null;
  const [customer, pendings] = await Promise.all([getCustomerById(user!.id), getPendingExchangesByCustomerId(user!.id)]);

  return (
    <AuthProvider context={{user, type: "customer"}}>
      <MisPuntosShell name={customer.name} points={customer.points}>
        {pendings.length > 0 && <PendingsList pendings={pendings} />}

        <Suspense fallback={<RewardsSkeleton />}>
          <RewardsSection currentPoints={customer.points} />
        </Suspense>

        <EliminarPerfilButton customerId={user!.id} pendings={pendings.length > 0} />
      </MisPuntosShell>
    </AuthProvider>
  );
}
