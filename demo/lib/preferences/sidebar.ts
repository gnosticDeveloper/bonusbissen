import { setPreferenceCookie } from "./cookie";

/**
 * Preferencia visual de la barra lateral del panel (solo escritorio).
 *
 * Se guarda en cookie, no en localStorage, para que el servidor pueda renderizar
 * el estado correcto en el HTML inicial y no haya un parpadeo "expandida → contraída"
 * después de hidratar. El layout de `/d/[slug]` ya es dinámico (lee la cookie de
 * sesión y hace fetch `no-store`), así que leer esta cookie no cambia el modo de
 * renderizado de ninguna ruta.
 *
 * Nunca es control de acceso: solo decide cómo se dibuja el menú.
 */
export const SIDEBAR_COOKIE_NAME = "bb_sidebar";

const COLLAPSED = "collapsed";
const EXPANDED = "expanded";

/** Interpreta el valor crudo de la cookie. Cualquier otra cosa se trata como expandida. */
export function isSidebarCollapsed(value: string | undefined): boolean {
  return value === COLLAPSED;
}

/** Persiste la preferencia desde el navegador. Debe correr solo en el cliente. */
export function persistSidebarCollapsed(collapsed: boolean): void {
  setPreferenceCookie(SIDEBAR_COOKIE_NAME, collapsed ? COLLAPSED : EXPANDED);
}
