import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-12 lg:py-5">
    <div className="mx-auto min-w-0 max-w-2xl lg:max-w-6xl">
      <div className="mt-8 lg:mt-5">{children}</div>
    </div>
  </main>;
}
