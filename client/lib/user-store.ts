"use client";

import { create } from "zustand";

type UserState = {
  user: {
    name: string;
    avatarUrl: string | null;
  } | null;
  setUser: (user: { name: string; avatarUrl: string | null }) => void;
  reset: VoidFunction;
};

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  reset: () => set({ user: null }),
}));
