import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuardianContacts } from "./GuardianContacts";
import { GuardianRoutines } from "./GuardianRoutines";
import { GuardianToday } from "./GuardianToday";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();
const off = { can_see_routines: false, can_get_lost_alerts: false, can_get_stuck_alerts: false };
const routines = [
  { id: "r1", title: "Morning routine", tone: "teal", start_time: "08:00", days: ["mon"], step_count: 4, steps_done: 4, status: "done" },
  { id: "r2", title: "Pick up prescription", tone: "orange", start_time: "14:00", days: ["mon"], step_count: 4, steps_done: 0, status: "next" },
  { id: "r3", title: "Evening routine", tone: "sea", start_time: "21:00", days: ["mon"], step_count: 3, steps_done: 0, status: "later" },
];
const shared = {
  name: "Jordan",
  shares: { ...off, can_see_routines: true },
  routines,
  feed: [{ time: "08:31", title: "Finished Morning routine", sub: "4 of 4 steps" }],
  streak: 4,
  tokens: 30,
};
const hidden = { name: "Jordan", shares: off, routines: null, feed: null, streak: null, tokens: null };

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("GuardianToday", () => {
  it("shows the day, up next and the feed when routines are shared", async () => {
    fetchMock.mockResolvedValue(json(shared));
    render(<GuardianToday personId="u1" name="Jordan" />);
    expect(await screen.findByRole("heading", { name: "1 of 3 done today" })).toBeInTheDocument();
    expect(screen.getByText("UP NEXT · 2:00 PM")).toBeInTheDocument();
    expect(screen.getByText("Finished Morning routine")).toBeInTheDocument();
    expect(screen.getByText("8:31 AM")).toBeInTheDocument();
    expect(screen.getByText("4-day streak")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toMatch(/^\/api\/guardian\/people\/u1\/day\?tz=/);
  });

  it("shows nothing of the day when routines aren't shared", async () => {
    fetchMock.mockResolvedValue(json(hidden));
    render(<GuardianToday personId="u1" name="Jordan" />);
    expect(await screen.findByRole("heading", { name: "Not shared yet" })).toBeInTheDocument();
    expect(screen.getByText("Jordan hasn't shared their routines")).toBeInTheDocument();
    expect(screen.queryByText(/UP NEXT/)).toBeNull();
    expect(screen.queryByText(/streak/)).toBeNull();
  });
});

describe("GuardianRoutines", () => {
  it("lists shared routines with their status, an Edit link, and New", async () => {
    fetchMock.mockResolvedValue(json({ ...shared, added: [] }));
    render(<GuardianRoutines personId="u1" name="Jordan" />);
    expect(await screen.findByText("Pick up prescription")).toBeInTheDocument();
    expect(screen.getByText("Done today")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit Pick up prescription" })).toHaveAttribute("href", "/guardian/u1/edit/r2");
    expect(screen.getByRole("link", { name: "Make a routine for Jordan" })).toHaveAttribute("href", "/guardian/u1/new");
  });

  it("shows only the routines the guardian added when routines aren't shared", async () => {
    fetchMock.mockResolvedValue(json({ ...hidden, added: [routines[2]] }));
    render(<GuardianRoutines personId="u1" name="Jordan" />);
    expect(await screen.findByText(/You can see and change only the ones you added/)).toBeInTheDocument();
    expect(screen.getByText("Evening routine")).toBeInTheDocument();
    expect(screen.queryByText("Morning routine")).toBeNull();
    expect(screen.queryByText("Later today")).toBeNull();
  });
});

describe("GuardianContacts", () => {
  const maria = {
    id: "c1",
    user_id: "u1",
    name: "Aunt Maria",
    method: "sms",
    contact: "5555550100",
    relation: "Aunt",
    can_see_routines: false,
    can_get_lost_alerts: true,
    can_get_stuck_alerts: false,
    added_by: "g1",
  };

  it("adds a contact and says sharing starts off", async () => {
    fetchMock.mockResolvedValueOnce(json({ contacts: [] })).mockResolvedValueOnce(json({ id: "c1" }, 201)).mockResolvedValue(json({ contacts: [maria] }));
    render(<GuardianContacts personId="u1" name="Jordan" />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Aunt Maria" } });
    fireEvent.change(screen.getByLabelText("How they know Jordan"), { target: { value: "Aunt" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "(555) 555-0100" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add contact" }));
    expect(await screen.findByText(/Added Aunt Maria. Jordan chooses what they can see/)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Change Aunt Maria" })).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ name: "Aunt Maria", relation: "Aunt", contact: "(555) 555-0100", method: "sms" });
  });

  it("changes a contact the guardian added", async () => {
    fetchMock.mockResolvedValueOnce(json({ contacts: [maria] })).mockResolvedValueOnce(json({ contact: { id: "c1" } })).mockResolvedValue(json({ contacts: [maria] }));
    render(<GuardianContacts personId="u1" name="Jordan" />);
    fireEvent.click(await screen.findByRole("button", { name: "Change Aunt Maria" }));
    expect(screen.getByLabelText("Phone")).toHaveValue("5555550100");
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "555 555 0199" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Saved Aunt Maria.")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/guardian/people/u1/contacts/c1");
    expect(init.method).toBe("PATCH");
  });

  it("asks before removing a contact", async () => {
    fetchMock.mockResolvedValueOnce(json({ contacts: [maria] })).mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValue(json({ contacts: [] }));
    render(<GuardianContacts personId="u1" name="Jordan" />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove Aunt Maria" }));
    expect(screen.getByRole("dialog", { name: "Remove Aunt Maria?" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("Removed Aunt Maria.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1]).toEqual(["/api/guardian/people/u1/contacts/c1", { method: "DELETE" }]);
  });

  it("shows the field errors from the server", async () => {
    fetchMock.mockResolvedValueOnce(json({ contacts: [] })).mockResolvedValue(json({ errors: { contact: "Add their phone number." } }, 400));
    render(<GuardianContacts personId="u1" name="Jordan" />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Maria" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add contact" }));
    await waitFor(() => expect(screen.getByText("Add their phone number.")).toBeInTheDocument());
    expect(screen.getByLabelText("Phone")).toHaveAttribute("aria-invalid", "true");
  });
});
