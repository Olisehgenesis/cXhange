import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "cSwitch - FX-Focused DEX on Celo",
  description: "Trade FX pairs and stablecoins on Celo with cSwitch - the premier FX-focused decentralized exchange",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
