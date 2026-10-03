import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Capacity | Your training",
  description: "Personal workout planning, Peloton and strength logs, and knee response tracking.",
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

