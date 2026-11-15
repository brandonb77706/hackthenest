import { CheckInDemo } from "@/features/notifications/CheckInDemo";
import { WebPushDemo } from "@/features/notifications/WebPushDemo";

export default function NotificationsTestPage() {
  return <main><WebPushDemo /><CheckInDemo /></main>;
}
