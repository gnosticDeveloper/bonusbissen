import { cookies } from "next/headers";
import { GUIDES_COOKIE_NAME, guidesEnabledFrom } from "@/lib/preferences/guides";
import { SettingsPreferences } from "./settings-preferences";

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, cookieStore] = await Promise.all([params, cookies()]);

  return (
    <main className="mx-auto w-full max-w-3xl text-foreground">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Configuración</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-foreground/80">
          Estas preferencias se guardan en este navegador. Si entrás al panel desde otro dispositivo, vas a tener que elegirlas de nuevo.
        </p>
      </header>
      {/* Read on the server so the switch renders in its real position, without a flash after loading. */}
      <SettingsPreferences slug={slug} defaultGuidesEnabled={guidesEnabledFrom(cookieStore.get(GUIDES_COOKIE_NAME)?.value)} />
    </main>
  );
}
