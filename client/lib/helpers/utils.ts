import { twMerge, type ClassNameValue } from 'tailwind-merge'
import z from 'zod';

/** Joins class names (strings, nested arrays, falsy values are skipped) and resolves Tailwind conflicts; later classes win. */
export function cn(...inputs: ClassNameValue[]) {
  return twMerge(inputs)
}

export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}
