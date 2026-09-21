import RedemptionValidator, { RedemptionValidatorSkeleton } from "@/components/redemption-validator";
import ResolvedRedemptionsList, { ResolvedRedemptionsSkeleton } from "@/components/resolved-redemption-list";
import { Suspense } from "react";

export default function ValidationPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 text-foreground sm:px-6 lg:px-8">
      {" "}
      <header className="mb-7 max-w-xl">
        {" "}
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"> Operaciones </p>{" "}
        <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl"> Validar canjes </h1>{" "}
        <p className="mt-2 text-sm leading-6 text-muted"> Verificá el código de una recompensa y confirmá su entrega al cliente. </p>{" "}
      </header>{" "}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        {" "}
        <Suspense fallback={<RedemptionValidatorSkeleton />}>
          {" "}
          <RedemptionValidator />{" "}
        </Suspense>{" "}
        <Suspense fallback={<ResolvedRedemptionsSkeleton />}>
          {" "}
          <ResolvedRedemptionsList />{" "}
        </Suspense>{" "}
      </div>{" "}
    </main>
  );
}
