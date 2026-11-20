import { z } from "zod";

/** 8–72 characters with a lowercase letter, an uppercase letter, a digit and a symbol. */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

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
      PASSWORD_PATTERN,
      "La contraseña debe tener entre 8 y 72 caracteres e incluir, al menos, una mayúscula, una minúscula, un número y un carácter especial",
    ),

  name: z.string().trim().min(1, "El nombre es obligatorio").max(255, "El nombre no puede superar los 255 caracteres"),

  email: z.email("El email no es válido").trim().min(1, "El email es obligatorio").max(255, "El email no puede superar los 255 caracteres"),
});

export const userLoginSchema = z.object({
  identifier: z.string().trim().min(1, "Ingresá tu usuario o email"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

/** Body of the auth endpoints that issue an access token; the refresh token arrives as a `Set-Cookie`. */
export const sessionTokenSchema = z.object({ token: z.string() });
