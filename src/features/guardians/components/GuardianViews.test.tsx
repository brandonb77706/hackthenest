import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuardianContacts } from "./GuardianContacts";
import { GuardianRoutines, stepsFromText } from "./GuardianRoutines";
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
  it("turns lines into steps", () => {
    expect(stepsFromText(" Sort \n\nWash\n")).toEqual(["Sort", "Wash"]);
  });

  it("lists shared routines with their status", async () => {
    fetchMock.mockResolvedValue(json(shared));
    render(<GuardianRoutines personId="u1" name="Jordan" />);
    expect(await screen.findByText("Pick up prescription")).toBeInTheDocument();
    expect(screen.getByText("Done today")).toBeInTheDocument();
    expect(screen.getByText("Up next")).toBeInTheDocument();
  });

  it("adds a routine even when routines aren't shared", async () => {
    fetchMock.mockResolvedValueOnce(json(hidden)).mockResolvedValueOnce(json({ id: "r9" }, 201)).mockResolvedValue(json(hidden));
    render(<GuardianRoutines personId="u1" name="Jordan" />);
    expect(await screen.findByText(/hasn't shared their routines/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ New" }));
    fireEvent.change(screen.getByLabelText("Routine name"), { target: { value: "Laundry day" } });
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "17:00" } });
    fireEvent.change(screen.getByLabelText("Steps, one per line"), { target: { value: "Sort clothes\nStart the washer" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to Jordan's routines" }));
    expect(await screen.findByText(/Added Laundry day to Jordan's routines/)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/guardian/people/u1/routines");
    expect(JSON.parse(init.body)).toMatchObject({
      title: "Laundry day",
      start_time: "17:00",
      steps: [
        { text: "Sort clothes", minutes: 5 },
        { text: "Start the washer", minutes: 5 },
      ],
    });
  });

  it("asks for steps before sending", async () => {
    fetchMock.mockResolvedValue(json(hidden));
    render(<GuardianRoutines personId="u1" name="Jordan" />);
    fireEvent.click(await screen.findByRole("button", { name: "+ New" }));
    fireEvent.change(screen.getByLabelText("Routine name"), { target: { value: "Laundry" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to Jordan's routines" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Add at least one step");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("GuardianContacts", () => {
  it("adds a contact and says sharing starts off", async () => {
    fetchMock.mockResolvedValue(json({ id: "c1" }, 201));
    render(<GuardianContacts personId="u1" name="Jordan" />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Aunt Maria" } });
    fireEvent.change(screen.getByLabelText("How they know Jordan"), { target: { value: "Aunt" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "(555) 555-0100" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add contact" }));
    expect(await screen.findByText("Added: Aunt Maria")).toBeInTheDocument();
    expect(screen.getByText(/Everything starts off/)).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: "Aunt Maria", relation: "Aunt", contact: "(555) 555-0100", method: "sms" });
  });

  it("shows the field errors from the server", async () => {
    fetchMock.mockResolvedValue(json({ errors: { contact: "Add their phone number." } }, 400));
    render(<GuardianContacts personId="u1" name="Jordan" />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Maria" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add contact" }));
    await waitFor(() => expect(screen.getByText("Add their phone number.")).toBeInTheDocument());
    expect(screen.getByLabelText("Phone")).toHaveAttribute("aria-invalid", "true");
  });
});
