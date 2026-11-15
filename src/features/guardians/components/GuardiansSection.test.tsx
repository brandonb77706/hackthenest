import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuardiansSection } from "./GuardiansSection";

const sam = {
  link_id: "l1",
  id: "g1",
  name: "Sam",
  email: "sam@example.com",
  can_see_routines: false,
  can_get_lost_alerts: false,
  can_get_stuck_alerts: false,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("GuardiansSection", () => {
  it("says when there's no guardian yet", async () => {
    fetchMock.mockResolvedValue(json({ links: [] }));
    render(<GuardiansSection />);
    expect(await screen.findByText("No guardian yet.")).toBeInTheDocument();
  });

  it("shows a code to give a guardian", async () => {
    fetchMock.mockResolvedValueOnce(json({ links: [] })).mockResolvedValueOnce(json({ code: "K7P2QX", expires_at: new Date(Date.now() + 864e5).toISOString() }));
    render(<GuardiansSection />);
    await screen.findByText("No guardian yet.");
    fireEvent.click(screen.getByRole("button", { name: "+ Add a guardian" }));
    const dialog = await screen.findByRole("dialog", { name: "Add a guardian" });
    expect(await within(dialog).findByText("K7P 2QX")).toBeInTheDocument();
    expect(within(dialog).getByText(/Works once/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/links/codes", expect.objectContaining({ method: "POST" }));
  });

  it("starts with sharing off and saves each switch", async () => {
    fetchMock.mockResolvedValueOnce(json({ links: [sam] })).mockResolvedValueOnce(json({ can_see_routines: true }));
    render(<GuardiansSection />);
    fireEvent.click(await screen.findByRole("button", { name: /Sam, guardian. Sees nothing/ }));
    const dialog = screen.getByRole("dialog", { name: "What Sam can see" });
    const routines = within(dialog).getByRole("switch", { name: "When I finish a routine" });
    expect(routines).toHaveAttribute("aria-checked", "false");
    fireEvent.click(routines);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/links/l1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ can_see_routines: true }) })),
    );
    expect(routines).toHaveAttribute("aria-checked", "true");
  });

  it("asks before removing a guardian", async () => {
    fetchMock.mockResolvedValueOnce(json({ links: [sam] })).mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<GuardiansSection />);
    fireEvent.click(await screen.findByRole("button", { name: /Sam, guardian/ }));
    fireEvent.click(screen.getByRole("button", { name: "Remove guardian" }));
    expect(screen.getByRole("dialog", { name: "Remove Sam?" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("Sam is no longer linked.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/links/l1", { method: "DELETE" });
  });
});
