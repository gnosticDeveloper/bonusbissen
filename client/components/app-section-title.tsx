"use client";
import { getPageNameByPathname } from "@/lib/consts";
import { usePathname } from "next/navigation";

export default function AppSectionTitle() {
  const pathname = usePathname()

  const pageName = getPageNameByPathname(pathname);

  return <h1 className="font-serif text-xl font-semibold text-foreground">{pageName}</h1>;
}
