import { create } from "zustand";

type Customer = {
  id: string;
  name: string;
  points: number;
  phone: string;
};

interface CustomerProfileState {
  customer: Customer | null;
  setInfo: (customer: Customer) => void;
}

export const useCustomerProfileStore = create<CustomerProfileState>()((set) => ({
  customer: null,
  setInfo: (customer: Customer) => set({ customer }),
}));
