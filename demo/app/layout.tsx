import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Demo • Bonus Bissen • Fidelización de puntos",
  description: "Sistema de fidelización de puntos y recompensas para tu negocio. Demo funcional de Bonus Bissen.",
  generator: "v0.app",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2ead9" },
    { media: "(prefers-color-scheme: dark)", color: "#2a251f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className={`${jakarta.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}>
        {/* Apply persisted theme before paint to avoid flash */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=sessionStorage.getItem('bb_theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`}
        </Script>
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
