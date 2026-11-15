import { Suspense } from "react";
import { TabBar } from "@/components/bridge/TabBar";
import { WelcomeGate } from "@/features/onboarding/components/WelcomeGate";
import { RoutineReminderMonitor } from "@/features/notifications/RoutineReminderMonitor";

/** The main app: a phone-width column with the tab bar at the bottom. */
export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="br-root relative mx-auto min-h-dvh w-full max-w-[480px] bg-canvas text-ink">
      {/* New users go to Welcome first; guardians to their own view. */}
      <Suspense>
        <WelcomeGate />
      </Suspense>
      {/* Nati's in-app routine reminders, on every tab. */}
      <RoutineReminderMonitor />
      <main>{children}</main>
      <TabBar />
    </div>
  );
}
