import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toono · Тоо ба тэнгэрийн тайлал",
  description: "Эцгийн код болон төрсөн агшны натал зургийг Монгол хэлээр тайлна.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = { themeColor: "#080819", colorScheme: "dark" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn">
      <body className="antialiased"><a className="skip-link" href="#main-content">Үндсэн хэсэг рүү алгасах</a>{children}</body>
    </html>
  );
}
