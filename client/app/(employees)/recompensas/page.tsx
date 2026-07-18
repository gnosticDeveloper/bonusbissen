"use client";
import CreateRewardForm from "@/components/recompensas/create-reward-form";
import RewardsList from "@/components/recompensas/rewards-list";
import { EmployeeRole, useAuth } from "@/providers/auth-provider";

export default function RecompensasPage() {
  const employee = useAuth();

  if (!employee) return null;

  const isAdmin = employee.type === "employee" && employee.user?.role === EmployeeRole.ADMIN;
  return (
    <div className={isAdmin ? "grid grid-cols-3 gap-8" : "grid grid-cols-2 gap-8"}>
      <div className="col-span-2 flex flex-col gap-6">
        <header>
          <h2 className="text-4xl font-bold text-ink">Recompensas</h2>
          <p className="text-xl text-ink-soft mt-2">Estas son las recompensas que los clientes pueden canjear con sus puntos.</p>
        </header>

        <RewardsList />
      </div>

      {isAdmin ? (
        <div className="col-span-1">
          <CreateRewardForm />
        </div>
      ) : null}
    </div>
  );
}
