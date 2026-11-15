// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const createClient = vi.fn();
vi.mock("@base44/sdk", () => ({ createClient: (...args: unknown[]) => createClient(...args) }));

import { BASE44_FUNCTION, createBase44Provider, resetBase44Client } from "./base44";

const provider = (model = "default") => createBase44Provider({ feature: "routineBuilder", model });
const returns = (result: unknown) => invoke.mockResolvedValue({ data: { result } });

beforeEach(() => {
  resetBase44Client();
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_BASE44_APP_ID", "app123");
  vi.stubEnv("BASE44_FUNCTION_SECRET", "s3cret");
  createClient.mockImplementation(() => ({ functions: { invoke } }));
});
afterEach(() => vi.unstubAllEnvs());

describe("Base44 provider", () => {
  it("calls the invokeLLM backend function with the secret, prompt, and schema", async () => {
    returns({ title: "Morning", steps: [] });
    const schema = { type: "object" };

    const result = await provider().generateJSON({ prompt: "Make steps", schema });

    expect(result).toEqual({ title: "Morning", steps: [] });
    expect(createClient).toHaveBeenCalledWith(expect.objectContaining({ appId: "app123" }));
    expect(invoke).toHaveBeenCalledWith(BASE44_FUNCTION, {
      secret: "s3cret",
      prompt: "Make steps",
      response_json_schema: schema,
    });
  });

  it("pins a model when one is set, and sends files", async () => {
    returns("hi");
    expect(await provider("gemini_3_8_flash").generateText({ prompt: "Hello", files: ["https://x/p.jpg"] })).toBe("hi");
    expect(invoke).toHaveBeenCalledWith(BASE44_FUNCTION, {
      secret: "s3cret",
      prompt: "Hello",
      model: "gemini_3_8_flash",
      file_urls: ["https://x/p.jpg"],
    });
  });

  it("sends photos to the function, which stores them privately", async () => {
    returns({ what_it_is: "A bill" });
    const image = { data: "aGVsbG8=", mime: "image/jpeg" as const };
    await provider().generateJSON({ prompt: "Read this", schema: {}, images: [image] });
    expect(invoke).toHaveBeenCalledWith(BASE44_FUNCTION, {
      secret: "s3cret",
      prompt: "Read this",
      response_json_schema: {},
      images: [image],
    });
  });

  it("reads JSON that comes back as text", async () => {
    returns('{"title":"T"}');
    expect(await provider().generateJSON({ prompt: "p", schema: {} })).toEqual({ title: "T" });
  });

  it("passes odd text through so the feature's parser can reject it", async () => {
    returns("Sorry, I can't help with that.");
    expect(await provider().generateJSON({ prompt: "p", schema: {} })).toBe("Sorry, I can't help with that.");
  });

  it("fails clearly when the function returns nothing", async () => {
    invoke.mockResolvedValue({ data: {} });
    await expect(provider().generateText({ prompt: "p" })).rejects.toThrow(/no result/);
  });

  it("passes on errors from Base44, like a wrong secret", async () => {
    invoke.mockRejectedValue(new Error("Unauthorized"));
    await expect(provider().generateText({ prompt: "p" })).rejects.toThrow("Unauthorized");
  });

  it("reuses one client across calls", async () => {
    returns("ok");
    await provider().generateText({ prompt: "a" });
    await provider().generateText({ prompt: "b" });
    expect(createClient).toHaveBeenCalledOnce();
  });

  it("explains what to set when the app id or secret is missing", async () => {
    vi.stubEnv("BASE44_FUNCTION_SECRET", "");
    await expect(provider().generateText({ prompt: "p" })).rejects.toThrow(/BASE44_FUNCTION_SECRET/);
    vi.stubEnv("BASE44_FUNCTION_SECRET", "s3cret");
    vi.stubEnv("NEXT_PUBLIC_BASE44_APP_ID", "");
    vi.stubEnv("BASE44_APP_ID", "");
    await expect(provider().generateText({ prompt: "p" })).rejects.toThrow(/NEXT_PUBLIC_BASE44_APP_ID/);
  });
});
