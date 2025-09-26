import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Sri Mallikarjuna Traders | Fireworks B2C & B2B",
  description:
    "Sri Mallikarjuna Traders - Retail & Wholesale fireworks. Shop Diwali sparklers, rockets, flower pots, gift boxes, and wholesale combos with dual pricing.",
  manifest: "/manifest.webmanifest",
  themeColor: "#ff6a00",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icon.svg", sizes: "any" }],
  },
  metadataBase: new URL("https://sri-mallikarjuna-traders.example.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        {/* PWA: register Service Worker */}
        <Script id="sw-register" strategy="afterInteractive">{`
          if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `}</Script>
        <Navbar />
        {children}
        <Toaster richColors position="top-right" />
        <VisualEditsMessenger />
      </body>
    </html>
  );
}