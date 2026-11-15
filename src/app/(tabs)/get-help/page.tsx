import type { Metadata } from "next";
import { HelpScreen } from "@/features/help/components/HelpScreen";

export const metadata: Metadata = { title: "Get help · Bridge" };

// The Help tab (owner: George). Uses George's lost mode logic in src/features/help.
export default function GetHelpPage() {
  return <HelpScreen />;
}
