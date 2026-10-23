import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LangProvider, LanguageSwitch } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "CaptchaLab",
  description: "Explore, interact with and understand CAPTCHA interaction signals in a controlled lab.",
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
