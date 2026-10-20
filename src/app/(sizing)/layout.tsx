import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SizingHeader } from "@/components/sizing/sizing-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import "../globals.css";
import "./sizing.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AAE Sizing — dimenzování a bezpečnost vzdušných odpařovačů",
  description:
    "Výkon, počet × výška trubek a ochrana CS potrubí za vzdušným odpařovačem LIN / LOX / LAr. Verdikty Kapacita a Ochrana (R01–R10), LTPS, dohřívač, porovnání umístění.",
};

// Separate root layout: the sizing app has its own chrome (no medium context of the v.2 calculator).
export default function SizingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground antialiased">
        <TooltipProvider delay={200}>
          <SizingHeader />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
