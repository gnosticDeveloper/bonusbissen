"use server";
import { Exchange, Movement } from "@/lib/definitions";
import { cookies } from "next/headers";

export async function getMovements(): Promise<Movement[]> {
  const token = (await cookies()).get("bb_token")?.value;
  const response = await fetch(`http://localhost:8080/api/customers/movements`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error("No se pudo obtener los movimientos");
  return await response.json();
}

export async function getExchangesByCustomerPhone(phone: string): Promise<Exchange[]> {
  const token = (await cookies()).get("bb_token")?.value;
  const response = await fetch(`http://localhost:8080/api/customers/exchanges/${phone}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error("No se pudo obtener los intercambios");
  return await response.json();
}

export interface CustomerReward {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  costPoints: number;
  discountValue: number;
  createdAt: number;
};

export async function getExchanges(): Promise<CustomerReward[]> {
  const token = (await cookies()).get("bb_token")?.value;
  const response = await fetch(`http://localhost:8080/api/customers/rewards`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error("No se pudo obtener las recompensas");
  return await response.json();
}
