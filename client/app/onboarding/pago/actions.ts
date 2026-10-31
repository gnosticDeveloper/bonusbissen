"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cookieOptions, PAYMENT_COOKIE } from "../state";

export async function simulatePayment() {
  // This marker is deliberately not used as an authentication or entitlement check.
  (await cookies()).set(PAYMENT_COOKIE, "simulated", { ...cookieOptions, maxAge: 60 * 60 * 24 });
  redirect("/onboarding");
}
