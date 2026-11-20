import { twMerge, type ClassNameValue } from 'tailwind-merge'

/** Joins class names (strings, nested arrays, falsy values are skipped) and resolves Tailwind conflicts; later classes win. */
export function cn(...inputs: ClassNameValue[]) {
  return twMerge(inputs)
}
