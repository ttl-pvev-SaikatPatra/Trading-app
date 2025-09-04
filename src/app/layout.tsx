import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Import Inter
import "./globals.css";

// Configure the font
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trading Bot Dashboard",
  description: "Your automated command center for Indian Equities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Apply the font class to the body */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}
