import { Suspense } from "react";
import { GuardianTabBar } from "@/features/guardians/components/GuardianTabBar";

/** The guardian view of one person: their tabs at the bottom. */
export default function PersonLayout({ children }: LayoutProps<"/guardian/[personId]">) {
  return (
    <div className="br-root relative mx-auto min-h-dvh w-full max-w-[480px] bg-canvas text-ink">
      <main>{children}</main>
      {/* The tabs read the person's id from the address. */}
      <Suspense>
        <GuardianTabBar />
      </Suspense>
    </div>
  );
}
