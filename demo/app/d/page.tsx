"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { currentStaff, useDemoState } from "@/lib/demo/store";

export default function DashboardMainPage() {
  const router = useRouter();
  const state = useDemoState();

  useEffect(() => {
    if (state) router.replace(currentStaff(state) ? "/d/inicio" : "/d/sign-in");
  }, [state, router]);

  return null;
}
