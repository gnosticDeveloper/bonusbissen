import { normalizePhoneNumber } from "@/lib/normalize-phone-number";
import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(60, "El nombre no puede superar los 60 caracteres."),

  phone: z
    .string()
    .trim()
    .min(1, "El teléfono es obligatorio.")
    .transform((val, ctx) => {
      const normalized = normalizePhoneNumber(val);
      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          message: "El teléfono no tiene un formato válido.",
        });
        return z.NEVER;
      }
      return normalized;
    }),

  points: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.coerce
      .number()
      .int("Los puntos deben ser un número entero.")
      .min(0, "Los puntos no pueden ser negativos.")
      .optional()
  ),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
