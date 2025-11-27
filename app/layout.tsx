import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Agent - Voice Assistant Demo",
  description: "Demo project for OpenAI Realtime API voice sales agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

