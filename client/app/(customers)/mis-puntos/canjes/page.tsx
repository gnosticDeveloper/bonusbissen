import { resolveCustomerIdFromSession } from "@/lib/session";
import { getExchangesByCustomerId } from "../../actions";
import ExchangeHistoryList from "@/components/canjes/exchanges-history-list";

export default async function MisCanjesPage() {
  const customerId = await resolveCustomerIdFromSession();
  const exchanges = await getExchangesByCustomerId(customerId!);

  return (
    <div className="min-h-screen px-5 pt-24 pb-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        <ExchangeHistoryList exchanges={exchanges} />
      </div>
    </div>
  );
}
