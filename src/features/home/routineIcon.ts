import type { IconName } from "@/components/bridge/Icon";

/** Sun for morning routines, star for afternoon, moon for evening. */
export function routineIcon(startTime: string): IconName {
  const hour = Number(startTime.slice(0, 2));
  if (!Number.isFinite(hour)) return "star";
  if (hour < 12) return "sun";
  if (hour < 17) return "star";
  return "moon";
}
