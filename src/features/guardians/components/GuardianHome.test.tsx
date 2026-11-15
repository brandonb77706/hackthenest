import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { GuardianHome } from "./GuardianHome";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();
const jordan = { link_id: "l1", id: "u1", name: "Jordan", email: "j@x.com", can_see_routines: false, can_get_lost_alerts: false, can_get_stuck_alerts: false };

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("GuardianHome", () => {
  it("asks a new helper for the code right on the page", async () => {
    fetchMock.mockResolvedValueOnce(json({ links: [] }));
    render(<GuardianHome name="Sam" />);
    expect(await screen.findByRole("heading", { name: "Enter your code" })).toBeInTheDocument();
    expect(screen.getByLabelText("Code")).toBeInTheDocument();
    expect(screen.getByText(/tap Add a helper/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the person's view once the code works", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ links: [] }))
      .mockResolvedValueOnce(json({ link_id: "l1", other_name: "Jordan", name: null }));
    render(<GuardianHome name="Sam" />);
    const link = await screen.findByRole("button", { name: "Link" });
    expect(link).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "abc 234" } });
    fireEvent.click(link);
    expect(await screen.findByText(/You're linked with Jordan/)).toBeInTheDocument();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/guardian"));
  });

  it("shows why a code didn't work and stays on the page", async () => {
    fetchMock.mockResolvedValueOnce(json({ links: [] })).mockResolvedValueOnce(json({ error: "That code is too old. Ask for a new one." }, 409));
    render(<GuardianHome name="Sam" />);
    fireEvent.change(await screen.findByLabelText("Code"), { target: { value: "ABC234" } });
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That code is too old.");
    expect(push).not.toHaveBeenCalled();
  });

  it("can still set up Bridge for someone who doesn't use it yet", async () => {
    fetchMock.mockResolvedValueOnce(json({ links: [] })).mockResolvedValueOnce(json({ code: "ABC234", expires_at: new Date(Date.now() + 864e5).toISOString() }));
    render(<GuardianHome name="Sam" />);
    fireEvent.click(await screen.findByRole("button", { name: "Set up Bridge for someone" }));
    const dialog = screen.getByRole("dialog", { name: "Set up Bridge for someone" });
    const get = within(dialog).getByRole("button", { name: "Get a setup code" });
    expect(get).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("What should Bridge call them?"), { target: { value: " Jordan " } });
    fireEvent.click(get);
    expect(await within(dialog).findByText("ABC 234")).toBeInTheDocument();
    expect(within(dialog).getByText(/On Jordan's phone/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/links/codes", expect.objectContaining({ body: JSON.stringify({ name: "Jordan" }) }));
  });

  it("lists linked people and links more with a code", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ links: [jordan] }))
      .mockResolvedValueOnce(json({ link_id: "l2", other_name: "Alex", name: null }))
      .mockResolvedValueOnce(json({ links: [jordan, { ...jordan, link_id: "l2", id: "u2", name: "Alex" }] }));
    render(<GuardianHome name="Sam" />);
    expect(await screen.findByRole("heading", { name: "People you support" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter a code from someone" }));
    const dialog = screen.getByRole("dialog", { name: "Enter a code" });
    fireEvent.change(within(dialog).getByLabelText("Code"), { target: { value: "abc 234" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Link" }));
    expect(await screen.findByText(/You're linked with Alex/)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Alex/ })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
