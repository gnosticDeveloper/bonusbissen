import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bonus Bissen • La vieja estación",
  description: "Sistema de puntos y recompensas para clientes frecuentes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={instrumentSans.variable}>
      <body className="bg-cream text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
