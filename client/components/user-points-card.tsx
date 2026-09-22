import { getMemberPoints } from "@/app/s/[slug]/(member-only)/inicio/actions";

export async function UserPointsCard({ storefrontId, pointLabel }: { storefrontId: string; pointLabel: string | null }) {
  const result = await getMemberPoints(storefrontId);
  const points = result.ok ? result.data.points : null;

  return (
    <div className="rounded-3xl bg-[#1f1c20] px-5 py-6 text-center text-white shadow-[0_16px_40px_rgba(20,16,25,0.12)]">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/55">Tus {pointLabel ?? "puntos"}</p>
      <p className="mt-2 text-4xl font-semibold tabular-nums">{points !== null ? points.toLocaleString("es-AR") : "—"}</p>
    </div>
  );
}
