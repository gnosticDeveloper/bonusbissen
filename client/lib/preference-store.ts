import { create } from "zustand";

type PreferenceStore = {
  selectedCity: string | null;
  setSelectedCity: (city: string | null) => void;
};

const usePreferenceStore = create<PreferenceStore>()((set) => ({
  selectedCity: null,
  setSelectedCity: (city) => set({ selectedCity: city }),
}));

export const useSelectedCity = () => usePreferenceStore((state) => state.selectedCity);
export const useUpdateSelectedCity = () => usePreferenceStore((state) => state.setSelectedCity);
