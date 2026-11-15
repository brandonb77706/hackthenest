// Linking users and guardians. Server code only. Every function takes the
// signed-in account and only touches links that account is part of.

import mongoose, { isValidObjectId } from "mongoose";
import type { SignedInUser } from "@/lib/auth/session";
import { connectDB, GuardianLinkModel, SetupCodeModel, toRecord, UserProfileModel } from "@/lib/db";
import type { GuardianLink, ID, SetupCode, TrustedContactPermissions, UserProfile } from "@/lib/types";
import { checkRedeem, CODE_TTL_MS, linkSides, makeCode, normalizeCode, type RedeemProblem } from "./codes";
import { cleanName } from "@/features/onboarding/welcome";

export interface NewCode {
  code: string;
  expires_at: string;
}

/** Makes a one-time code for the other side to enter. A guardian can add the person's name. */
export async function createCode(creator: SignedInUser, name?: string | null): Promise<NewCode> {
  await connectDB();
  const expires_at = new Date(Date.now() + CODE_TTL_MS);
  // An old code from the same person stops working, so only the newest one is live.
  await SetupCodeModel.deleteMany({ created_by: creator.id, used_at: null });
  for (let tries = 0; ; tries++) {
    try {
      const doc = await SetupCodeModel.create({
        code: makeCode(),
        from_role: creator.role,
        created_by: creator.id,
        name: creator.role === "guardian" ? cleanName(name) : null,
        expires_at,
      });
      return { code: doc.code, expires_at: expires_at.toISOString() };
    } catch (error) {
      // Two codes came out the same (very rare): try another.
      if ((error as { code?: number }).code === 11000 && tries < 4) continue;
      throw error;
    }
  }
}

export type RedeemResult =
  | { ok: true; link_id: ID; other_name: string; name: string | null }
  | { ok: false; problem: RedeemProblem | "bad_format" };

/** Uses a code: links the two accounts. Each code works once. */
export async function redeemCode(redeemer: SignedInUser, input: unknown): Promise<RedeemResult> {
  const code = normalizeCode(input);
  if (!code) return { ok: false, problem: "bad_format" };
  await connectDB();
  const found = await SetupCodeModel.findOne({ code });
  const facts = found ? toRecord<SetupCode>(found) : null;
  const check = checkRedeem(facts, redeemer);
  if (!check.ok || !facts) return { ok: false, problem: check.ok ? "not_found" : check.problem };

  // Claim it in one step, so two people entering the same code can't both use it.
  const claimed = await SetupCodeModel.findOneAndUpdate(
    { _id: facts.id, used_at: null },
    { $set: { used_at: new Date(), used_by: redeemer.id } },
  );
  if (!claimed) return { ok: false, problem: "used" };

  const sides = linkSides(facts, redeemer.id);
  const link = await GuardianLinkModel.findOneAndUpdate(
    sides,
    { $setOnInsert: sides },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  // A guardian who set Bridge up for someone gave their name: Welcome fills it in.
  if (facts.from_role === "guardian" && facts.name) {
    await UserProfileModel.updateOne(
      { user_id: redeemer.id, onboarded: { $ne: true } },
      { $set: { name: facts.name } },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).catch((error: { code?: number }) => {
      // Already onboarded: the upsert hits the unique user_id. Keep their own name.
      if (error.code !== 11000) throw error;
    });
  }

  const [other] = await accountNames([facts.created_by]);
  return { ok: true, link_id: String(link._id), other_name: other?.name ?? "", name: facts.name };
}

interface Account {
  id: ID;
  name: string;
  email: string;
}

/** Names from the login accounts (Better Auth's "user" collection), with the profile name preferred. */
async function accountNames(ids: ID[]): Promise<Account[]> {
  const db = mongoose.connection.db;
  if (!db || ids.length === 0) return [];
  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
  const [accounts, profiles] = await Promise.all([
    db.collection("user").find({ _id: { $in: objectIds } }, { projection: { name: 1, email: 1 } }).toArray(),
    UserProfileModel.find({ user_id: { $in: ids } }).setOptions({ allUsers: true }),
  ]);
  const profileName = new Map(profiles.map((p) => [toRecord<UserProfile>(p).user_id, toRecord<UserProfile>(p).name]));
  return ids.map((id) => {
    const account = accounts.find((a) => String(a._id) === id);
    const name = profileName.get(id);
    return {
      id,
      name: (name && name !== "Friend" ? name : account?.name) ?? "",
      email: (account?.email as string | undefined) ?? "",
    };
  });
}

export interface LinkedPerson extends TrustedContactPermissions {
  link_id: ID;
  /** The other account */
  id: ID;
  name: string;
  email: string;
}

/** For a user: their guardians. For a guardian: the people they support. */
export async function listLinks(me: SignedInUser): Promise<LinkedPerson[]> {
  await connectDB();
  const mine = me.role === "guardian" ? { guardian_id: me.id } : { user_id: me.id };
  const links = (await GuardianLinkModel.find(mine).sort({ created_at: 1 })).map((doc) => toRecord<GuardianLink>(doc));
  const others = await accountNames(links.map((l) => (me.role === "guardian" ? l.user_id : l.guardian_id)));
  return links.map((l, i) => ({
    link_id: l.id,
    id: others[i].id,
    name: others[i].name,
    email: others[i].email,
    can_see_routines: l.can_see_routines,
    can_get_lost_alerts: l.can_get_lost_alerts,
    can_get_stuck_alerts: l.can_get_stuck_alerts,
  }));
}

/** Ends a link. Either side can. */
export async function removeLink(me: SignedInUser, linkId: string): Promise<boolean> {
  if (!isValidObjectId(linkId)) return false;
  await connectDB();
  const res = await GuardianLinkModel.deleteOne({ _id: linkId, $or: [{ user_id: me.id }, { guardian_id: me.id }] });
  return res.deletedCount === 1;
}

/** What a guardian can see. Only the user can change it. */
export async function updateSharing(
  me: SignedInUser,
  linkId: string,
  patch: Partial<TrustedContactPermissions>,
): Promise<boolean> {
  if (me.role !== "user" || !isValidObjectId(linkId)) return false;
  await connectDB();
  const res = await GuardianLinkModel.updateOne({ _id: linkId, user_id: me.id }, { $set: patch });
  return res.matchedCount === 1;
}
