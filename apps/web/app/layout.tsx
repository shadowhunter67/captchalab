import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LangProvider, LanguageSwitch } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "CaptchaLab",
  description: "Explore, interact with and understand CAPTCHA interaction signals in a controlled lab.",
  // An inline icon: no /favicon.ico request (it would 404 and log a console error, and break under the Pages base path).
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237ba2ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='14' height='14' rx='3'/%3E%3Cpath d='M8 3h10a3 3 0 0 1 3 3v10'/%3E%3Cpath d='m7.5 12 2.5 2.5 4-5'/%3E%3C/svg%3E",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">
        <LangProvider>
          {children}
          {/* After the page in DOM order so it does not take the first Tab stop; it is fixed-position visually. */}
          <LanguageSwitch />
        </LangProvider>
      </body>
    </html>
  );
}
