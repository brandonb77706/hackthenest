import type { Metadata } from "next";
import { RoutinesScreen } from "@/features/routine-builder/components/RoutinesScreen";
import { RoutineReminderMonitor } from "@/features/notifications/RoutineReminderMonitor";

export const metadata: Metadata = { title: "Routines · Bridge" };

export default function RoutinesPage() {
  return <><div className="px-4 pt-4"><RoutineReminderMonitor /></div><RoutinesScreen /></>;
}
