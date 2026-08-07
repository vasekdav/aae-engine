import type { Metadata } from "next";
import "./dotaznik.css";

export const metadata: Metadata = {
  title: "Nástupní dotazník – FINIDR, s.r.o.",
  description:
    "Nástupní dotazník pro nové zaměstnance společnosti FINIDR, s.r.o.",
  robots: { index: false, follow: false },
};

// Separate root layout: the questionnaire has its own light visual identity
// and must not inherit the calculator chrome (header/footer, dark theme).
export default function DotaznikLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
