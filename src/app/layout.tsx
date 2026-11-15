import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Lexend } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/settings";
import "./globals.css";

// Atkinson Hyperlegible is designed for low vision; Lexend for reading ease. Both from the design.
const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bridge",
  description: "Support for daily routines, paperwork, and getting help.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8ed1f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the boot script sets data-theme before React loads.
    <html lang="en" className={`${atkinson.variable} ${lexend.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Puts the saved color scheme on the page before it paints. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      {/* Browser extensions like Grammarly add attributes to <body>, which makes
          React warn about a mismatch. This only ignores attribute differences on
          this one tag. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
