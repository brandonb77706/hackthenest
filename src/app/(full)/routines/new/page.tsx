import type { Metadata } from "next";
import { Builder } from "@/features/routine-builder/components/Builder";

export const metadata: Metadata = { title: "New routine · Bridge" };

export default function NewRoutinePage() {
  return <Builder />;
}
