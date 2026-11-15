import { connection } from "next/server";
import { checkedInToday, dueRoutineReminders, easternDate } from "@/features/notifications/routineReminders";
import { CheckInModel, connectDB, getCurrentUserId, RoutineModel } from "@/lib/db";

export async function GET(request: Request) {
  await connection();
  const userId = await getCurrentUserId();
  await connectDB();
  const now = new Date();
  const routines = await RoutineModel.find({ user_id: userId, active: true }).select({ _id: 1, title: 1, days: 1, start_time: 1, active: 1 }).lean();
  const checkIns = await CheckInModel.find({ user_id: userId, time: { $gte: new Date(now.getTime() - 36 * 60 * 60 * 1000), $lte: now } }).select({ routine_id: 1, time: 1 }).lean();
  const checkedIn = checkedInToday(checkIns.map((item) => ({ routine_id: String(item.routine_id), time: new Date(item.time).toISOString() })), easternDate(now));
  const delivered = new URL(request.url).searchParams.get("delivered")?.split(",").filter((id) => /^[a-f\d]{24}:\d{4}-\d{2}-\d{2}:\d{4}:(before|late)$/.test(id)).slice(0, 200) ?? [];
  const reminders = dueRoutineReminders(
    routines.map((item) => ({
      id: String(item._id),
      title: item.title,
      days: item.days,
      start_time: item.start_time,
      active: item.active,
    })),
    checkedIn,
    now,
    new Set(delivered),
  );
  return Response.json({ reminders }, { headers: { "Cache-Control": "no-store" } });
}
