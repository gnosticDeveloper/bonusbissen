import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type PreferenceStore = {
  selectedCity: string | null;
  setSelectedCity: (city: string | null) => void;
};

const usePreferenceStore = create<PreferenceStore>()(
  persist(
    (set) => ({
      selectedCity: null,
      setSelectedCity: (city) => set({ selectedCity: city }),
    }),
    {
      name: "bb-selected-city",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ selectedCity: state.selectedCity }),
      skipHydration: true,
    },
  ),
);

export const useSelectedCity = () => {
  const city = usePreferenceStore((state) => state.selectedCity);

  useEffect(() => {
    if (!usePreferenceStore.persist.hasHydrated()) void usePreferenceStore.persist.rehydrate();
  }, []);

  return city;
};
export const useUpdateSelectedCity = () => usePreferenceStore((state) => state.setSelectedCity);
