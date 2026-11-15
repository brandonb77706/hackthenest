// What a guardian can see and do for someone they're linked to. Server code only.
// Every function first checks the link, then uses only what the person shares.

import { isValidObjectId } from "mongoose";
import { createContact, deleteContact, listContacts, updateContact } from "@/features/help/service";
import type { ContactInput } from "@/features/help/contactInput";
import { getToday } from "@/features/home/service";
import type { TodayRoutine } from "@/features/home/today";
import type { RoutineInput } from "@/features/routine-builder/routineInput";
import { createRoutine, deleteRoutine, getRoutine, updateRoutine, type RoutineWithSteps } from "@/features/routine-builder/service";
import type { SignedInUser } from "@/lib/auth/session";
import { CheckInModel, connectDB, GuardianLinkModel, RoutineModel, toRecord } from "@/lib/db";
import { localNow } from "@/lib/time";
import {
  DEFAULT_CONTACT_PERMISSIONS,
  type CheckIn,
  type GuardianLink,
  type ID,
  type TrustedContact,
  type TrustedContactPermissions,
} from "@/lib/types";
import { dayFeed, type FeedItem } from "./day";

/** The link between this guardian and this person, or null if there isn't one. */
export async function findLink(guardian: SignedInUser, userId: string): Promise<GuardianLink | null> {
  if (guardian.role !== "guardian" || !isValidObjectId(userId)) return null;
  await connectDB();
  const doc = await GuardianLinkModel.findOne({ guardian_id: guardian.id, user_id: userId });
  return doc ? toRecord<GuardianLink>(doc) : null;
}

function sharesOf(link: GuardianLink): TrustedContactPermissions {
  return {
    can_see_routines: link.can_see_routines,
    can_get_lost_alerts: link.can_get_lost_alerts,
    can_get_stuck_alerts: link.can_get_stuck_alerts,
  };
}

export interface PersonDay {
  name: string;
  shares: TrustedContactPermissions;
  /** Null unless the person shares their routines */
  routines: TodayRoutine[] | null;
  /** Routines this guardian added. Always visible to them, shared or not */
  added: TodayRoutine[];
  feed: FeedItem[] | null;
  streak: number | null;
  tokens: number | null;
}

/** Someone's day, as much as they share. Null if not linked. */
export async function getPersonDay(guardian: SignedInUser, userId: string, timeZone: string, at = new Date()): Promise<PersonDay | null> {
  const link = await findLink(guardian, userId);
  if (!link) return null;
  const [today, mine] = await Promise.all([
    getToday(userId, timeZone, at),
    RoutineModel.find({ user_id: userId, added_by: guardian.id }, { _id: 1 }),
  ]);
  const mineIds = new Set(mine.map((doc) => String(doc._id)));
  const added = today.routines.filter((r) => mineIds.has(r.id));
  const shares = sharesOf(link);
  if (!shares.can_see_routines) {
    return { name: today.name, shares, routines: null, added, feed: null, streak: null, tokens: null };
  }

  const recent = await CheckInModel.find({
    user_id: userId,
    status: "done",
    time: { $gte: new Date(at.getTime() - 36 * 3600_000) },
  });
  const date = localNow(at, timeZone).date;
  const checkIns = recent
    .map((doc) => toRecord<CheckIn>(doc))
    .filter((c) => localNow(new Date(c.time), timeZone).date === date);

  return {
    name: today.name,
    shares,
    routines: today.routines,
    added,
    feed: dayFeed(today.routines, checkIns, timeZone),
    streak: today.streak,
    tokens: today.tokens,
  };
}

/** A guardian helps by adding a routine. It shows up in the person's Routines. */
export async function addRoutineFor(guardian: SignedInUser, userId: string, input: RoutineInput): Promise<ID | null> {
  if (!(await findLink(guardian, userId))) return null;
  const routine = await createRoutine(userId, input, guardian.id);
  return routine.id;
}

/**
 * A guardian helps by adding a trusted contact. Sharing always starts off:
 * only the person can turn it on, from their Me tab.
 */
export async function addContactFor(guardian: SignedInUser, userId: string, input: ContactInput): Promise<ID | null> {
  if (!(await findLink(guardian, userId))) return null;
  const contact = await createContact(userId, { ...input, ...DEFAULT_CONTACT_PERMISSIONS }, guardian.id);
  return contact.id;
}

/**
 * A routine the guardian may change: any routine when the person shares their
 * routines, or one the guardian added. Null otherwise.
 */
export async function getRoutineFor(guardian: SignedInUser, userId: string, routineId: string): Promise<RoutineWithSteps | null> {
  const link = await findLink(guardian, userId);
  if (!link) return null;
  const routine = await getRoutine(userId, routineId);
  if (!routine) return null;
  return link.can_see_routines || routine.added_by === guardian.id ? routine : null;
}

export async function updateRoutineFor(guardian: SignedInUser, userId: string, routineId: string, input: RoutineInput): Promise<boolean> {
  if (!(await getRoutineFor(guardian, userId, routineId))) return false;
  return (await updateRoutine(userId, routineId, input)) !== null;
}

export async function deleteRoutineFor(guardian: SignedInUser, userId: string, routineId: string): Promise<boolean> {
  if (!(await getRoutineFor(guardian, userId, routineId))) return false;
  return deleteRoutine(userId, routineId);
}

/** The contacts this guardian added for the person. The person's own list isn't shared. */
export async function listContactsFor(guardian: SignedInUser, userId: string): Promise<TrustedContact[] | null> {
  if (!(await findLink(guardian, userId))) return null;
  return (await listContacts(userId)).filter((c) => c.added_by === guardian.id);
}

async function contactFor(guardian: SignedInUser, userId: string, contactId: string): Promise<TrustedContact | null> {
  return (await listContactsFor(guardian, userId))?.find((c) => c.id === contactId) ?? null;
}

/** Changes who a contact is. What they can see stays as the person set it. */
export async function updateContactFor(guardian: SignedInUser, userId: string, contactId: string, input: ContactInput): Promise<boolean> {
  const before = await contactFor(guardian, userId, contactId);
  if (!before) return false;
  const saved = await updateContact(userId, contactId, {
    ...input,
    can_see_routines: before.can_see_routines,
    can_get_lost_alerts: before.can_get_lost_alerts,
    can_get_stuck_alerts: before.can_get_stuck_alerts,
  });
  return saved !== null;
}

export async function deleteContactFor(guardian: SignedInUser, userId: string, contactId: string): Promise<boolean> {
  if (!(await contactFor(guardian, userId, contactId))) return false;
  return deleteContact(userId, contactId);
}
