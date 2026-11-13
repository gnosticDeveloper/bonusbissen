"use client";

import { Spinner } from "@/components/spinner";
import { useStaffSession } from "@/lib/demo/hooks";

/** Cashiers are sent back to the home page, as in the main app. */
export default function AdminOnlyLayout({ children }: { children: React.ReactNode }) {
  const { staff } = useStaffSession({ adminOnly: true });
  if (!staff) {
    return (
      <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-foreground/80">
        <Spinner />
      </div>
    );
  }
  return children;
}
