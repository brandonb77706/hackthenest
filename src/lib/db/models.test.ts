// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { CheckIn, Routine, TrustedContact } from "@/lib/types";
import { DEMO_USER_ID } from "./currentUser";
import {
  AvatarModel,
  CheckInModel,
  RoutineModel,
  StepModel,
  TokenTransactionModel,
  TrustedContactModel,
  UserProfileModel,
} from "./models";
import { toRecord } from "./schema";

const user_id = DEMO_USER_ID;
const someId = "64b0000000000000000000aa";

describe("UserProfile", () => {
  it("fills in defaults", async () => {
    const doc = new UserProfileModel({ user_id, name: "Jordan" });
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.toJSON()).toMatchObject({
      speech_speed: 0.9,
      support_level: "high",
      demo_mode: false,
      current_streak: 0,
      streak_freezes: 0,
      last_streak_date: null,
      equipped_avatar_id: null,
    });
  });

  it("rejects values outside the allowed range", async () => {
    await expect(new UserProfileModel({ user_id, name: "J", speech_speed: 2 }).validate()).rejects.toThrow(/speech_speed/);
    await expect(new UserProfileModel({ user_id, name: "J", streak_freezes: 3 }).validate()).rejects.toThrow(/streak_freezes/);
    await expect(new UserProfileModel({ user_id, name: "J", support_level: "max" }).validate()).rejects.toThrow(/support_level/);
    await expect(new UserProfileModel({ user_id, name: "J", last_streak_date: "Nov 14" }).validate()).rejects.toThrow(/last_streak_date/);
  });
});

describe("TrustedContact", () => {
  it("starts with every sharing setting off", () => {
    const contact = toRecord<TrustedContact>(
      new TrustedContactModel({ user_id, name: "Sam", method: "sms", contact: "555-0100" }),
    );
    expect(contact.can_see_routines).toBe(false);
    expect(contact.can_get_lost_alerts).toBe(false);
    expect(contact.can_get_stuck_alerts).toBe(false);
  });

  it("rejects an unknown contact method", async () => {
    await expect(
      new TrustedContactModel({ user_id, name: "Sam", method: "fax", contact: "x" }).validate(),
    ).rejects.toThrow(/method/);
  });
});

describe("Routine and Step", () => {
  it("checks start_time and days", async () => {
    const base = { user_id, title: "Morning", goal: "Get ready" };
    await expect(new RoutineModel({ ...base, start_time: "08:00", days: ["mon"] }).validate()).resolves.toBeUndefined();
    await expect(new RoutineModel({ ...base, start_time: "8am" }).validate()).rejects.toThrow(/start_time/);
    await expect(new RoutineModel({ ...base, start_time: "24:00" }).validate()).rejects.toThrow(/start_time/);
    await expect(new RoutineModel({ ...base, start_time: "08:00", days: ["monday"] }).validate()).rejects.toThrow(/days/);
  });

  it("requires step order, text, and minutes", async () => {
    const step = new StepModel({ user_id, routine_id: someId });
    const error = await step.validate().catch((e: Error) => e.message);
    expect(error).toMatch(/order/);
    expect(error).toMatch(/text/);
    expect(error).toMatch(/minutes/);
  });
});

describe("TokenTransaction", () => {
  const tx = (amount: number, reason: string) => new TokenTransactionModel({ user_id, amount, reason });

  it("accepts earned tokens and purchases", async () => {
    await expect(tx(5, "step").validate()).resolves.toBeUndefined();
    await expect(tx(-100, "purchase").validate()).resolves.toBeUndefined();
  });

  it("never takes tokens away outside a purchase", async () => {
    await expect(tx(-5, "step").validate()).rejects.toThrow(/never taken away/);
    await expect(tx(0, "streak").validate()).rejects.toThrow(/amount/);
  });

  it("rejects a purchase that adds tokens", async () => {
    await expect(tx(100, "purchase").validate()).rejects.toThrow(/negative/);
  });

  it("rejects fractional tokens", async () => {
    await expect(tx(2.5, "step").validate()).rejects.toThrow(/whole number/);
  });
});

describe("Avatar", () => {
  it("needs a price for shop avatars and a streak for streak avatars", async () => {
    const base = { name: "Fox", image_url: "/avatars/fox.png" };
    await expect(new AvatarModel({ ...base, unlock_type: "starter" }).validate()).resolves.toBeUndefined();
    await expect(new AvatarModel({ ...base, unlock_type: "shop" }).validate()).rejects.toThrow(/price/);
    await expect(new AvatarModel({ ...base, unlock_type: "shop", price: 50 }).validate()).resolves.toBeUndefined();
    await expect(new AvatarModel({ ...base, unlock_type: "streak" }).validate()).rejects.toThrow(/streak_required/);
  });

  it("has a unique index on name", () => {
    expect(AvatarModel.schema.indexes()).toContainEqual([{ name: 1 }, expect.objectContaining({ unique: true })]);
  });

  it("has no user_id, since it's a shared catalog", () => {
    expect(AvatarModel.schema.path("user_id")).toBeUndefined();
  });
});

describe("toRecord", () => {
  it("turns a document into the plain shape from types.ts", () => {
    const time = new Date("2026-11-14T09:00:00.000Z");
    const doc = new CheckInModel({ user_id, step_id: someId, routine_id: someId, status: "done", time });
    const record = toRecord<CheckIn>(doc);

    expect(record).toEqual({
      id: doc._id.toHexString(),
      user_id,
      step_id: someId,
      routine_id: someId,
      status: "done",
      used_help: false,
      time: "2026-11-14T09:00:00.000Z",
    });
    expect(record).not.toHaveProperty("_id");
    expect(record).not.toHaveProperty("__v");
  });

  it("keeps arrays as arrays", () => {
    const record = toRecord<Routine>(
      new RoutineModel({ user_id, title: "T", goal: "G", start_time: "08:00", days: ["mon", "wed"] }),
    );
    expect(record.days).toEqual(["mon", "wed"]);
  });
});
