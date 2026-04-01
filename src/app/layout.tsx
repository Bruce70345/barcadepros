import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import AppBar from "@/components/AppBar";
import FloatingActionBar from "@/components/FloatingActionBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Barcade Pros",
  description: "Barcade Pros event calendar",
  openGraph: {
    title: "Barcade Pros",
    description: "Barcade Pros event calendar",
    type: "website",
    url: "/",
    images: [
      {
        url: "/icons/PWALogo.png",
        width: 512,
        height: 512,
        alt: "Barcade Pros",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Barcade Pros",
    description: "Barcade Pros event calendar",
    images: ["/icons/PWALogo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppBar />
          {children}
          <FloatingActionBar />
        </Providers>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
        />
      </body>
    </html>
  );
}
