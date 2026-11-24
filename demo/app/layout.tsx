import type { Metadata, Viewport } from "next";
import { Sofia_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { ModalProvider } from "@/components/modal";
import { ThemeProvider } from "@/providers/theme-provider";

const sofiaSans = Sofia_Sans({
  subsets: ["latin"],
  variable: "--font-sofia-sans",
  display: "swap",
  weight: "variable",
});

export const metadata: Metadata = {
  title: "Demo • Bonus Bissen • Sistema de fidelización de clientes",
  description: "Probá Bonus Bissen con datos de ejemplo: sumá puntos, canjeá recompensas y administrá tu programa de fidelización.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

// Same pre-paint theme script as the main app: reads the `theme` cookie before the first paint.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var m = document.cookie.match(/(?:^|; )theme=([^;]*)/);
    var theme = m ? decodeURIComponent(m[1]) : null;
    if (theme === "light" || theme === "dark" || theme === "abismo") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={sofiaSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ModalProvider>
            <ToastProvider>{children}</ToastProvider>
          </ModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
