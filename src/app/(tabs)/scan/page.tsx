import type { Metadata } from "next";
import { PlaceholderTab } from "@/features/home/components/PlaceholderTab";

export const metadata: Metadata = { title: "Scan · Bridge" };

// Camera help (owner: Adrian). Replace this placeholder with the real screen.
export default function ScanPage() {
  return (
    <PlaceholderTab
      title="Scan"
      icon="doc"
      lead="Take a picture of a letter, bill, or form."
      owner="Adrian"
    />
  );
}
