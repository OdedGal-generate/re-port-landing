import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.re-port.co.il"),
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
        url: "/images/og-image.jpg",
        width: 1200,
        height: 675,
        alt: "Re-PORT — Insurtech Gateway",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Re-PORT — Insurtech Gateway",
    description:
      "הורדת דוחות שנתיים אוטומטית מכל חברות הביטוח ובתי ההשקעות",
    images: ["/images/og-image.jpg"],
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
