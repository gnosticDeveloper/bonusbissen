// import ExchangesList from "@/components/canjes/exchanges-list";
import VerifyCodeForm from "@/components/canjes/verify-code-form";

export default function ExchangesPage() {

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-4xl font-bold text-ink">Canjes</h2>
        <p className="text-xl text-ink-soft mt-2">Verificá el código que te muestra el cliente antes de entregar.</p>
      </header>

      <div className="flex gap-8">
        <VerifyCodeForm />
        {/*<ExchangesList query={q} />*/}
      </div>
    </div>
  );
}
