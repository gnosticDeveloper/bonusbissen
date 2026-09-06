import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { ModalProvider } from "@/components/modal";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={instrumentSans.variable}>
      <body className="font-sans antialiased">
        <ModalProvider>
          <ToastProvider>{children}</ToastProvider>
        </ModalProvider>
      </body>
    </html>
  );
}
