import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ProductCategoryProvider } from "@/lib/context/ProductCategoryContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EXMARK ERP | Kerala FRP Architectural Doors Business Management",
  description: "Enterprise Operations and Manufacturing Platform for EXMARK Doors, Kerala.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ProductCategoryProvider>{children}</ProductCategoryProvider>
      </body>
    </html>
  );
}
