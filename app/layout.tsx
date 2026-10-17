import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toono — Таны тоонууд, таны түүх",
  description: "Төрсөн огноондоо тулгуурласан тоон зурхайн тайлангаа монгол хэлээр уншиж, PDF болон текстээр татаж аваарай.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn">
      <body className="antialiased">{children}</body>
    </html>
  );
}
