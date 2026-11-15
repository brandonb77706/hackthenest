import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useToday } from "./useToday";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("reloads when the local day changes while the page is open", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-11-17T12:00:00Z"));
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ routines: [], name: "", streak: 0, tokens: 0 }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const { result } = renderHook(() => useToday());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));
  await act(async () => { window.dispatchEvent(new Event("focus")); });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
});
