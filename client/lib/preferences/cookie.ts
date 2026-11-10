/** Writes a site-wide preference cookie that lasts a year. Browser only. */
export function setPreferenceCookie(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax`;
}
