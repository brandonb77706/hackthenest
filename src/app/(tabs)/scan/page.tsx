import type { Metadata } from "next";
import { ScanScreen } from "@/features/camera-help/components/ScanScreen";

export const metadata: Metadata = { title: "Scan · Bridge" };

export default function ScanPage() {
  return <ScanScreen />;
}
