import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toono — Your numbers, your story",
  description: "A little more understanding, written in your numbers. Explore your personal numerology reading in English or Mongolian.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
