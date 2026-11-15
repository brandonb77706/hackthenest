import { connection } from "next/server";
import { checkedInToday, dueRoutineReminders, safeTimeZone, zoneDate } from "@/features/notifications/routineReminders";
import { CheckInModel, connectDB, getCurrentUserId, RoutineModel, StepModel } from "@/lib/db";

/**
 * Reminders due right now (Nati): 10 minutes before a routine, and 10 minutes
 * after if it hasn't been started. GET /api/notifications/due?tz=America/Chicago&delivered=...
 * Routines with "Remind me" turned off never remind.
 */
export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const timeZone = safeTimeZone(url.searchParams.get("tz"));
  const userId = await getCurrentUserId();
  await connectDB();
  const now = new Date();
  const routines = await RoutineModel.find({ user_id: userId, active: true, remind: { $ne: false } })
    .select({ _id: 1, title: 1, days: 1, start_time: 1, active: 1 })
    .lean();
  const checkIns = await CheckInModel.find({ user_id: userId, time: { $gte: new Date(now.getTime() - 36 * 60 * 60 * 1000), $lte: now } })
    .select({ routine_id: 1, time: 1 })
    .lean();
  const checkedIn = checkedInToday(
    checkIns.map((item) => ({ routine_id: String(item.routine_id), time: new Date(item.time).toISOString() })),
    zoneDate(now, timeZone),
    timeZone,
  );
  const delivered =
    url.searchParams
      .get("delivered")
      ?.split(",")
      .filter((id) => /^[a-f\d]{24}:\d{4}-\d{2}-\d{2}:\d{4}:(before|late)$/.test(id))
      .slice(0, 200) ?? [];
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
    timeZone,
  );

  // Add each routine's step count for the message ("It has 4 steps.").
  if (reminders.length > 0) {
    const counts = await StepModel.countDocuments({ user_id: userId, routine_id: reminders[0].routineId });
    reminders[0].stepCount = counts;
  }
  return Response.json({ reminders }, { headers: { "Cache-Control": "no-store" } });
}
