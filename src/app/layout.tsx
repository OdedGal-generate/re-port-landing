import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Re-PORT — הורדת דוחות שנתיים אוטומטית לסוכני ביטוח",
  description:
    "Re-PORT מוריד אוטומטית דוחות שנתיים ואישורי מס מכל חברות הביטוח ובתי ההשקעות בקליק אחד. חוסך שעות עבודה לסוכני ביטוח.",
  openGraph: {
    title: "Re-PORT — Insurtech Gateway",
    description:
      "הורדת דוחות שנתיים אוטומטית מכל חברות הביטוח ובתי ההשקעות",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "https://re-port-landing.vercel.app/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Re-PORT — Insurtech Gateway",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} scroll-smooth`}>
      <body className="min-h-screen font-heebo antialiased">{children}</body>
    </html>
  );
}
