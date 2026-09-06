import { z } from "zod";

export const userRegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "El nombre de usuario es obligatorio")
    .min(3, "El nombre de usuario debe tener entre 3 y 100 caracteres")
    .max(100, "El nombre de usuario debe tener entre 3 y 100 caracteres")
    .regex(/^[a-zA-Z0-9._-]+$/, "El nombre de usuario solo puede contener letras, números y . _ -"),

  password: z
    .string()
    .min(1, "La contraseña es obligatoria")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,72}$/,
      "La contraseña debe tener entre 12 y 72 caracteres e incluir, al menos, una mayúscula, una minúscula, un número y un carácter especial",
    ),

  name: z.string().trim().min(1, "El nombre es obligatorio").max(255, "El nombre no puede superar los 255 caracteres"),

  email: z.email("El email no es válido").trim().min(1, "El email es obligatorio").max(255, "El email no puede superar los 255 caracteres"),
});

export const userLoginSchema = z.object({
  identifier: z.string().trim().min(1, "Ingresá tu usuario o email"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type UserLoginRequest = z.infer<typeof userLoginSchema>;

export type UserRegisterRequest = z.infer<typeof userRegisterSchema>;
