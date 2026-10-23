import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Эцгийн код — Таны ЭЦГИЙН КОД юу вэ?",
  description: "Аав болон таны төрсөн өдрөөс бүрдэх 81 бэлгэдлийн хослолын аль нь таны код болохыг мэдээрэй. Эд баялаг, зан төлөвийн бүрэн тайлал.",
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
