/**
 * Normaliza un número de teléfono argentino a un string de solo dígitos,
 * sin código de país ni prefijo de móvil "9".
 *
 * Maneja: espacios, guiones, paréntesis, "+", código de país "54" y el "9"
 * de móvil que suele venir pegado a él (típico al copiar desde WhatsApp).
 *
 * NO maneja: el "15" de discado local para celulares con prefijo de área +
 * "0" (ej: "03462 15-455123"), porque no se puede inferir de forma confiable
 * dónde termina el código de área sin una tabla de códigos por región. Si
 * esto genera problemas en la práctica, hay que sumar esa tabla.
 *
 * Devuelve null si, después de normalizar, el resultado no parece un
 * teléfono válido (muy corto) — para que el formulario pueda mostrar un
 * error en vez de guardar cualquier cosa.
 */
export function normalizePhoneNumber(input: string): string | null {
  let digits = input.replace(/\D/g, "");

  // Código de país argentino + posible "9" de móvil pegado (ej: WhatsApp)
  if (digits.startsWith("54")) {
    digits = digits.slice(2);
    if (digits.startsWith("9")) {
      digits = digits.slice(1);
    }
  }

  // Prefijo de discado local "0" (solo si NO venía con código de país)
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length < 8 || digits.length > 11) {
    return null;
  }

  return digits;
}
