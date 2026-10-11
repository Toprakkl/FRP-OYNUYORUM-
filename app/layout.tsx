import type { Metadata, Viewport } from "next";
import { Cinzel, DM_Sans, Inter, Literata, Share_Tech_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin", "latin-ext"], variable: "--font-cinzel", display: "swap" });
const literata = Literata({ subsets: ["latin", "latin-ext"], variable: "--font-literata", display: "swap" });
const dm = DM_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-dm", display: "swap" });
const share = Share_Tech_Mono({ subsets: ["latin"], weight: "400", variable: "--font-share", display: "swap" });
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-ui", display: "swap" });

export const metadata: Metadata = {
  title: "FRP Masası",
  description: "Tek kişilik, yapay zeka hakemli FRP masası.",
  applicationName: "FRP Masası",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d0d12",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className={`${cinzel.variable} ${literata.variable} ${dm.variable} ${share.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
