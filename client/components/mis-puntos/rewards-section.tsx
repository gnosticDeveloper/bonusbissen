import { getRewards } from "@/app/(customers)/actions";
import { Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function RewardSection({ currentPoints }: { currentPoints: number }) {
  const rewards = await getRewards();
  const availables = rewards.filter((r) => r.costPoints <= currentPoints);
  const blocked = rewards.filter((r) => r.costPoints > currentPoints);

  return (
    <>
      <section className="flex flex-col gap-3">
        {availables.length === 0 ? (
          <p className="text-xl text-ink-soft">Todavía no tenés puntos suficientes para ninguna recompensa.</p>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-ink">Podés canjear ahora</h2>
            <div className="flex flex-col gap-3 relative w-full">
              {availables.map((r) => (
                <Link
                  key={r.id}
                  href={`/mis-puntos/recompensas/${r.id}`}
                  className="rounded-2xl border border-sage/30 bg-sage/10 overflow-hidden flex items-center gap-4 hover:bg-sage/15 transition-colors"
                >
                  {r.imagePath && r.imagePath.length > 0 ? (
                    <Image width={80} height={80} src={r.imagePath} alt={r.title} className="w-20 h-20 object-cover shrink-0" />
                  ) : (
                    <Image width={80} height={80} src={"/laviejaestacion-logo.webp"} alt={r.title} className="w-20 h-20 object-cover shrink-0" />
                  )}
                  <div className="flex-1 flex items-center justify-between pr-4 py-3">
                    <div className="flex flex-col max-w-[15ch]">
                      <span className="font-medium text-ink truncate">{r.title}</span>
                      <p className="text-sm text-ink-soft truncate">{r.description}</p>
                    </div>
                    <span className="text-lg font-semibold text-sage-dark ">{r.costPoints} pts</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {blocked.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold text-ink">Seguí sumando puntos para desbloquear estas recompensas</h2>
          <div className="flex flex-col gap-3">
            {blocked.map((r) => (
              <div key={r.id} className="rounded-2xl border border-ink/10 bg-ink/5 overflow-hidden flex items-center gap-4 opacity-60">
                {r.imagePath && r.imagePath.length > 0 ? (
                  <Image width={96} height={96} src={r.imagePath} alt={r.title} className="w-24 h-24 object-cover shrink-0 grayscale" />
                ) : (
                  <Image
                    width={96}
                    height={96}
                    src={"/laviejaestacion-logo.webp"}
                    alt={r.title}
                    className="w-24 h-24 object-cover shrink-0 grayscale"
                  />
                )}
                <div className="flex-1 flex items-center justify-between pr-4 py-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-ink-soft" />
                    <div>
                      <p className="text-xl font-medium text-ink">{r.title}</p>
                      <p className="text-lg text-ink-soft">Te faltan {r.costPoints - currentPoints} puntos</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-ink-soft">{r.costPoints} pts</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
