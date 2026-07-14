import { resolveCustomerIdFromSession } from "@/lib/session";
import { getMovementsByCustomerId } from "../../actions";
import MovementsList from "@/components/movimientos/movements-list";

export default async function MovimientosPage() {
  const customerId = await resolveCustomerIdFromSession();
  const movements = await getMovementsByCustomerId(customerId!);

  return (
    <div className="min-h-screen px-5 pt-24 pb-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        <MovementsList movements={movements} />
      </div>
    </div>
  );
}
