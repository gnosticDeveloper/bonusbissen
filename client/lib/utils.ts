import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import z from 'zod';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}
