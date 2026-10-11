import type { Metadata, Viewport } from "next";
import "./globals.css";
import { temaActual } from "@/lib/tema";

export const metadata: Metadata = {
  title: "SUAN Academy",
  description: "App de la academia de squash SUAN Academy",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a1f33",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = await temaActual();
  return (
    <html lang="es" data-theme={tema}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
