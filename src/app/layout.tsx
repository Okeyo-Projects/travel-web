import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import FacebookPixel from "@/components/FacebookPixel";
import { FloatingChatButton } from "@/components/site/FloatingChatButton";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Okeyo Travel - Laissez parler votre mood",
  description:
    "En 2 minutes, OKEYO vous recommande l'endroit le plus adapté à vos envies.",
};

import type { ReactNode } from "react";
import { AuthModal } from "@/components/auth/auth-modal";
import { AuthProvider } from "@/providers/auth-provider";
import QueryProvider from "@/providers/query-provider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get("x-locale");
  const locale = isSupportedLocale(headerLocale)
    ? headerLocale
    : DEFAULT_LOCALE;

  return (
    <html lang={locale}>
      <FacebookPixel />
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${inter.variable} antialiased min-h-screen flex flex-col bg-white`}
      >
        <QueryProvider>
          <AuthProvider>
            <main className="flex-1">{children}</main>
            <FloatingChatButton />
            <AuthModal />
          </AuthProvider>
        </QueryProvider>
        <noscript>
          {/* biome-ignore lint/performance/noImgElement: Noscript fallback pixel must be a plain img tag. */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=4169949499921104&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </body>
    </html>
  );
}
