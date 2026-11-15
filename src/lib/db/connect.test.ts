// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { connectDB } from "./connect";
import mongoose, { Schema } from "mongoose";
import { defineModel } from "./schema";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("connectDB", () => {
  it("keeps the original collection registered when a model reloads before connecting", () => {
    const name = "BridgeReloadRegression";
    const first = defineModel(name, new Schema({ value: String }));
    const originalCollection = first.collection;
    const second = defineModel(name, new Schema({ value: String }));
    expect(second.collection).toBe(originalCollection);
    expect(mongoose.connection.collections[originalCollection.name]).toBe(originalCollection);
    mongoose.deleteModel(name);
  });
  it("explains what to do when MONGODB_URI is missing", () => {
    vi.stubEnv("MONGODB_URI", "");
    expect(() => connectDB()).toThrow(/MONGODB_URI is not set.*\.env\.local/);
  });
});
