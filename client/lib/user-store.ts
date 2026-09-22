"use client";

import { create } from "zustand";

type UserInfo = {
  name: string;
  username: string;
  // avatarUrl: string | null;
  emailVerified: boolean;
  email: string | null;
};

type UserStoreState = {
  user: UserInfo | null;
  setUser: (user: UserInfo) => void;
  reset: VoidFunction;
};

export const useUserStore = create<UserStoreState>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  reset: () => set({ user: null }),
}));
