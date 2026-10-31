import type { ReactNode } from "react";
import Link from "next/link";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-12">
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="text-xl font-bold">Bonus Bissen</Link>
      <p className="mt-2 text-sm text-foreground/70">Tu negocio, más cerca de sus clientes.</p>
      <div className="mt-8">{children}</div>
    </div>
  </main>;
}
