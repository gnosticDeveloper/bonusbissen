import { resolveCustomerIdFromSession } from "@/lib/session";
import { getExchangesByCustomerId } from "../../actions";
import ExchangeHistoryList from "@/components/canjes/exchanges-history-list";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function MisCanjesPage() {
  const customerId = await resolveCustomerIdFromSession();
  const exchanges = await getExchangesByCustomerId(customerId!);

  return (
    <div className="min-h-screen px-5 py-8 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col gap-6">
        <Link href="/mis-puntos" className="flex items-center gap-2 text-lg text-ink-soft hover:text-ink transition-colors self-start">
          <ArrowLeft className="h-5 w-5" />
          Volver
        </Link>
        <ExchangeHistoryList exchanges={exchanges} />
      </div>
    </div>
  );
}
