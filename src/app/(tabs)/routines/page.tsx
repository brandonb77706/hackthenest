import type { Metadata } from "next";
import { RoutinesScreen } from "@/features/routine-builder/components/RoutinesScreen";

export const metadata: Metadata = { title: "Routines · Bridge" };

export default function RoutinesPage() {
  return <RoutinesScreen />;
}
