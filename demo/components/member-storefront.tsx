"use client";

import { createContext, useContext } from "react";
import type { StorefrontDiscoverInfo } from "@/lib/demo/actions";

/** The storefront of the `/s/*` pages (`?local=`), resolved once by their layout. */
const MemberStorefrontContext = createContext<StorefrontDiscoverInfo | null>(null);

export const MemberStorefrontProvider = MemberStorefrontContext.Provider;

export function useMemberStorefront() {
  const storefront = useContext(MemberStorefrontContext);
  if (!storefront) throw new Error("useMemberStorefront must be used inside the member-only layout");
  return storefront;
}
