// @vitest-environment node
import mongoose from "mongoose";
import { beforeAll, describe, expect, it } from "vitest";
import { DEMO_USER_ID } from "./currentUser";
import { RoutineModel, TokenTransactionModel } from "./models";
import { checkOwnerFilter, MissingUserIdError } from "./owned";

beforeAll(() => {
  // No database in tests. Fail fast instead of waiting for a connection.
  mongoose.set("bufferTimeoutMS", 200);
});

describe("checkOwnerFilter", () => {
  it("allows a filter with user_id", () => {
    expect(() => checkOwnerFilter({ user_id: DEMO_USER_ID }, {})).not.toThrow();
  });

  it("rejects a filter without user_id", () => {
    expect(() => checkOwnerFilter({}, {})).toThrow(MissingUserIdError);
    expect(() => checkOwnerFilter({ user_id: null }, {})).toThrow(MissingUserIdError);
    expect(() => checkOwnerFilter({ title: "Morning" }, {})).toThrow(/user_id/);
  });

  it("lets a server job opt out on purpose", () => {
    expect(() => checkOwnerFilter({}, { allUsers: true })).not.toThrow();
  });
});

describe("ownedPlugin on models", () => {
  it("adds a required user_id", async () => {
    const doc = new RoutineModel({ title: "Morning", goal: "Get ready", start_time: "08:00" });
    await expect(doc.validate()).rejects.toThrow(/user_id/);
  });

  it("blocks queries that don't filter by user_id", async () => {
    await expect(RoutineModel.find({ active: true }).exec()).rejects.toThrow(MissingUserIdError);
    await expect(RoutineModel.findOne({}).exec()).rejects.toThrow(MissingUserIdError);
    await expect(RoutineModel.updateMany({}, { active: false }).exec()).rejects.toThrow(MissingUserIdError);
    await expect(RoutineModel.deleteMany({}).exec()).rejects.toThrow(MissingUserIdError);
    await expect(TokenTransactionModel.countDocuments({}).exec()).rejects.toThrow(MissingUserIdError);
  });

  it("blocks aggregates that don't start with a user_id $match", async () => {
    await expect(TokenTransactionModel.aggregate([{ $group: { _id: null } }]).exec()).rejects.toThrow(
      MissingUserIdError,
    );
  });

  it("lets a query with user_id through the guard", async () => {
    // No database here, so it fails later with a connection error, not the guard.
    const error = await RoutineModel.find({ user_id: DEMO_USER_ID }).exec().catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(MissingUserIdError);
  });
});
