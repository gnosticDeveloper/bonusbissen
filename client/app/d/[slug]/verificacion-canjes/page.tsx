import RedemptionValidator from "@/components/redemption-validator";
import ResolvedRedemptionsList, { ResolvedRedemptionsSkeleton } from "@/components/resolved-redemption-list";
import { Suspense } from "react";

export default function Page() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <RedemptionValidator />
      </div>

      <Suspense fallback={<ResolvedRedemptionsSkeleton />}>
        <ResolvedRedemptionsList />
      </Suspense>
    </div>
  );
}
