/**
 * Words the guides can't avoid. A `<Term>` shows them underlined in the storefront color and opens
 * this explanation, written for someone who has never used a loyalty system.
 */
export const GLOSSARY = {
  programa: {
    label: "Programa de puntos",
    definition: [
      "Es el sistema de puntos que usan uno o más de tus locales: define cómo se llaman los puntos, si vencen y qué recompensas se pueden pedir.",
      "Los puntos del cliente son del programa, no del local. Si dos locales comparten programa, el cliente puede sumar en uno y usarlos en el otro.",
    ],
  },
  afiliacion: {
    label: "Afiliarse",
    definition: [
      "Es cuando un cliente se suma al programa de puntos de tu local desde la app, por ejemplo escaneando tu código QR.",
      "Recién después de afiliarse le podés sumar puntos.",
    ],
  },
  "codigo-canje": {
    label: "Código de canje",
    definition: [
      "Cuando un cliente pide una recompensa desde la app, recibe un código de 6 caracteres, por ejemplo 1234A5.",
      "Te lo muestra en el mostrador y, con ese código, confirmás que le entregaste la recompensa.",
    ],
  },
  deuda: {
    label: "Puntos en deuda",
    definition: [
      "Si restás más puntos de los que el cliente tiene, su saldo queda por debajo de cero.",
      "Los próximos puntos que sume van a cubrir primero esa deuda.",
    ],
  },
  correccion: {
    label: "Corrección",
    definition: [
      "Es un ajuste que arregla un movimiento que se cargó mal.",
      "El movimiento original no se borra: queda a la vista junto con el ajuste, así siempre se sabe qué pasó y quién lo hizo.",
    ],
  },
  qr: {
    label: "Código QR",
    definition: [
      "Es un cuadrado con dibujos que se lee con la cámara del celular.",
      "Al apuntarle, el teléfono abre una página sin que haga falta escribir ninguna dirección.",
    ],
  },
  "formatos-imagen": {
    label: "PNG y SVG",
    definition: [
      "Son dos formatos de imagen. PNG sirve para imprimir en casa o compartir por WhatsApp.",
      "SVG se puede agrandar todo lo que quieras sin que se vea pixelado: es el que conviene mandarle a una imprenta o a quien te diseñe carteles.",
    ],
  },
  pdf: {
    label: "PDF",
    definition: [
      "Es un tipo de archivo para documentos que se ve igual en cualquier computadora o celular.",
      "Lo podés abrir, guardar, imprimir o mandar por mail o WhatsApp.",
    ],
  },
  "cobro-automatico": {
    label: "Autorización de cobro",
    definition: [
      "Es el permiso que le diste a Mercado Pago para cobrar tu plan de forma automática.",
      "Que esté autorizado no quiere decir que una factura ya esté pagada: eso lo ves en cada factura del historial.",
    ],
  },
  cookies: {
    label: "Cookies",
    definition: [
      "Son pequeños datos que el navegador guarda en este dispositivo. Las usamos para recordar qué guías y consejos ya viste.",
      "Si borrás los datos del navegador o entrás desde otro dispositivo, las guías vuelven a aparecer.",
    ],
  },
} as const satisfies Record<string, { label: string; definition: readonly string[] }>;

export type GlossaryTermId = keyof typeof GLOSSARY;
