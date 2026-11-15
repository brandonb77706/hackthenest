import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuardianHome } from "./GuardianHome";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("GuardianHome", () => {
  it("sets up Bridge for someone and shows the code with steps", async () => {
    fetchMock.mockResolvedValueOnce(json({ links: [] })).mockResolvedValueOnce(json({ code: "ABC234", expires_at: new Date(Date.now() + 864e5).toISOString() }));
    render(<GuardianHome name="Sam" />);
    expect(await screen.findByText(/No one yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Set up Bridge for someone" }));
    const dialog = screen.getByRole("dialog", { name: "Set up Bridge for someone" });
    const get = within(dialog).getByRole("button", { name: "Get a setup code" });
    expect(get).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("What should Bridge call them?"), { target: { value: " Jordan " } });
    fireEvent.click(get);
    expect(await within(dialog).findByText("ABC 234")).toBeInTheDocument();
    expect(within(dialog).getByText(/On Jordan's phone/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/links/codes", expect.objectContaining({ body: JSON.stringify({ name: "Jordan" }) }));
  });

  it("links with a code from someone's Me tab", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ links: [] }))
      .mockResolvedValueOnce(json({ link_id: "l1", other_name: "Jordan", name: null }))
      .mockResolvedValueOnce(json({ links: [{ link_id: "l1", id: "u1", name: "Jordan", email: "j@x.com", can_see_routines: false, can_get_lost_alerts: false, can_get_stuck_alerts: false }] }));
    render(<GuardianHome name="Sam" />);
    await screen.findByText(/No one yet/);
    fireEvent.click(screen.getByRole("button", { name: "Enter a code from someone" }));
    const dialog = screen.getByRole("dialog", { name: "Enter a code" });
    const link = within(dialog).getByRole("button", { name: "Link" });
    expect(link).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Code"), { target: { value: "abc 234" } });
    fireEvent.click(link);
    expect(await screen.findByText(/You're linked with Jordan/)).toBeInTheDocument();
    expect(await screen.findByText("Shares nothing yet")).toBeInTheDocument();
  });

  it("shows why a code didn't work", async () => {
    fetchMock.mockResolvedValueOnce(json({ links: [] })).mockResolvedValueOnce(json({ error: "That code is too old. Ask for a new one." }, 409));
    render(<GuardianHome name="Sam" />);
    await screen.findByText(/No one yet/);
    fireEvent.click(screen.getByRole("button", { name: "Enter a code from someone" }));
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "ABC234" } });
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That code is too old.");
  });
});
