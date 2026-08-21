"use client";
import { usePathname } from "next/navigation";

export default function AppSectionTitle() {
  const pathname = usePathname()

  return <h1 className="font-serif text-xl font-semibold text-foreground">{pathname}</h1>;
}
