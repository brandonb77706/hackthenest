import type { Metadata } from "next";
import { ui } from "@/features/routine-builder/ui";
import { LostModeScreen } from "@/features/help/LostModeScreen";

export const metadata: Metadata = {
  title: "Help",
};

// The help section (owner: George). Lost mode for now; stuck help and speak for me come later.
export default function HelpPage() {
  return (
    <main className={`${ui.page} space-y-8`}>
      <h1 className={ui.h1}>Help</h1>
      <LostModeScreen />
    </main>
  );
}
