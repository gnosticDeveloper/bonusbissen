import { Movement } from "@/app/(customers)/actions";
import Image from "next/image";

function MovementIcon({ movement }: { movement: Movement }) {
  const src = movement.imagePath || "/laviejaestacion-logo.webp";

  return <Image src={src} alt="" width={48} height={48} className="rounded-xl object-cover shrink-0" />;
}

export default function MovementsList({ movements }: { movements: Movement[] }) {
  if (movements.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-ink">Movimientos</h1>
        <p className="text-xl text-ink-soft">Todavía no tenés movimientos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <h1 className="text-3xl font-bold text-ink">Movimientos</h1>

      <div className="flex flex-col gap-3">
        {movements.map((m) => {
          const isEarn = m.type === "earn";

          return (
            <div key={m.id} className="rounded-2xl border border-ink/10 bg-cream-dark/30 px-4 py-3 flex items-center gap-4">
              <MovementIcon movement={m} />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xl font-medium text-ink truncate">{m.title}</p>
                  <span className="text-base text-ink-soft whitespace-nowrap">{m.formattedCreatedAt}</span>
                </div>

                <p className={`text-lg font-semibold ${isEarn ? "text-sage-dark" : "text-rust-dark"}`}>
                  {isEarn ? "+" : "-"}
                  {m.points}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
