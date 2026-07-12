import { getExchanges } from "@/app/actions";
import CanjesPanel from "@/components/canjes/canjes-panel";

export default async function CanjesPage() {
  const canjes = await getExchanges();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-4xl font-bold text-ink">Canjes</h2>
        <p className="text-xl text-ink-soft mt-2">Verificá el código que te muestra el cliente antes de entregar.</p>
      </header>

      <CanjesPanel initialExchanges={canjes} />
    </div>
  );
}
