import type { Metadata, Viewport } from "next";
import { Sofia_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { ModalProvider } from "@/components/modal";
import Script from "next/script";

const instrumentSans = Sofia_Sans({
  subsets: ["latin"],
  variable: "--font-sofia-sans",
  display: "swap",
  weight: "variable",
});

// TODO: use generateMetadata() instead of static metadata obj.
export const metadata: Metadata = {
  title: "Bonus Bissen • Página principal • Sistema de fidelización de clientes",
  description: "Sistema de puntos y recompensas para clientes frecuentes",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

// Corre de forma síncrona durante el parseo del <head>, antes del primer paint.
// No usa next/script porque queremos el control exacto de placement que describe
// la doc (script plano en <head>), no la abstracción de Script.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var m = document.cookie.match(/(?:^|; )theme=([^;]*)/);
    var theme = m ? decodeURIComponent(m[1]) : null;

    if (!theme) {
      // migración one-time desde el localStorage viejo (bb-theme).
      // Se puede borrar este bloque una vez que asumamos que ya no queda
      // nadie con el localStorage viejo sin cookie todavía.
      var legacy = localStorage.getItem("bb-theme");
      if (legacy === "light" || legacy === "dark") {
        theme = legacy;
        document.cookie = "theme=" + theme + "; path=/; max-age=31536000; SameSite=Lax";
      }
    }

    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    // si no hay cookie ni legacy: no seteamos nada, el CSS con
    // prefers-color-scheme se encarga del default.
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={instrumentSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <ModalProvider>
          <ToastProvider>{children}</ToastProvider>
        </ModalProvider>
      </body>
    </html>
  );
}
