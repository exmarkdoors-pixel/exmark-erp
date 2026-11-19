import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ProductCategoryProvider } from "@/lib/context/ProductCategoryContext";
import { DisplayPreferencesProvider } from "@/lib/context/DisplayPreferencesContext";
import { PwaRegister } from "@/components/pwa/PwaRegister";

export const metadata: Metadata = {
  title: "EXMARK ERP | Kerala FRP Architectural Doors Business Management",
  description: "Enterprise Operations and Manufacturing Platform for EXMARK Doors, Kerala.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EXMARK ERP",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B132B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <DisplayPreferencesProvider>
          <ProductCategoryProvider>
            {children}
            <PwaRegister />
          </ProductCategoryProvider>
        </DisplayPreferencesProvider>
      </body>
    </html>
  );
}
