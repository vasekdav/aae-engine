import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { MediumProvider } from "@/components/calculator/medium-context";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AAE ENGINE v.2 — návrh & bezpečnostní verifikace odpařovačů",
  description:
    "Návrh a bezpečnostní verifikace ambient-air odpařovačů pro N₂ / O₂ / Ar. Režimy NÁVRH, KAPACITA, RYCHLOST. CGA P-56 · EIGA Doc 133 · EIGA Doc 13 · ASME B31.3.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground antialiased">
        <TooltipProvider delay={200}>
          <MediumProvider>
            <SiteHeader />
            {children}
            <SiteFooter />
          </MediumProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
