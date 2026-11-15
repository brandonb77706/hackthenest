import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Lexend } from "next/font/google";
import type { ReactNode } from "react";
import { TabBar } from "@/components/TabBar";
import "@/components/bridge-theme.css";

// The design's fonts: Lexend for headings, Atkinson Hyperlegible for reading.
const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"] });
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Me",
};

export default function MeLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`bridge ${lexend.variable} ${atkinson.variable} flex flex-1 flex-col`}>
      {/* Bottom padding keeps the last card clear of the tab bar. */}
      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-6 pb-[116px]">{children}</main>
      <TabBar current="me" />
    </div>
  );
}
