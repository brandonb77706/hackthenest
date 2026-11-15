import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSettings, resetSettingsCache } from "@/lib/settings";
import type { BuddyChoice } from "@/features/me/summary";
import type { WelcomeData } from "../service";
import { WelcomeScreen } from "./WelcomeScreen";

const buddy = (id: string, name: string, over: Partial<BuddyChoice> = {}): BuddyChoice => ({
  id,
  name,
  unlock_type: "starter",
  price: null,
  streak_required: null,
  owned: false,
  equipped: false,
  can_choose: true,
  ...over,
});

const data = (over: Partial<WelcomeData> = {}): WelcomeData => ({
  name: "",
  buddies: [
    buddy("penguin", "Penguin"),
    buddy("fox", "Fox"),
    buddy("beaver", "Beaver"),
    buddy("frog", "Frog", { unlock_type: "shop", price: 120, can_choose: false }),
    buddy("turtle", "Turtle", { unlock_type: "streak", streak_required: 7, can_choose: false }),
  ],
  done: false,
  ...over,
});

const replace = vi.fn();
const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  resetSettingsCache();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("location", { ...window.location, replace });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));

describe("WelcomeScreen", () => {
  it("asks for a name first and waits until one is typed", () => {
    render(<WelcomeScreen data={data()} />);
    expect(screen.getByRole("heading", { name: "What should we call you?" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("fills in a name a guardian already gave", () => {
    render(<WelcomeScreen data={data({ name: "Jordan" })} />);
    expect(screen.getByLabelText("Your name")).toHaveValue("Jordan");
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("shows every Buddy, picks the Fox, and lets you go back", () => {
    render(<WelcomeScreen data={data({ name: "Jordan" })} />);
    next();
    expect(screen.getByRole("heading", { name: "Pick your Buddy" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "Fox" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Frog, locked, 120 tokens" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Turtle, locked, 7-day streak" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Your name")).toHaveValue("Jordan");
  });

  it("doesn't let you pick a locked Buddy", () => {
    render(<WelcomeScreen data={data({ name: "Jordan" })} />);
    next();
    fireEvent.click(screen.getByRole("radio", { name: /Frog/ }));
    expect(screen.getByRole("radio", { name: /Frog/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Fox" })).toHaveAttribute("aria-checked", "true");
  });

  it("saves the name and Buddy, and doesn't ask about colors", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ buddy_name: "Penguin" }), { status: 200 }));
    render(<WelcomeScreen data={data()} />);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: " Jordan " } });
    next();
    fireEvent.click(screen.getByRole("radio", { name: "Penguin" }));
    expect(screen.queryByText(/colors/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start using Bridge" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/me/welcome");
    expect(JSON.parse(init.body)).toEqual({ name: "Jordan", avatar_id: "penguin" });
    expect(getSettings()).toMatchObject({ buddyName: "Penguin" });
  });

  it("stays put and says so when saving fails", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "Please pick one of these Buddies." }), { status: 400 }));
    render(<WelcomeScreen data={data({ name: "Jordan" })} />);
    next();
    fireEvent.click(screen.getByRole("button", { name: "Start using Bridge" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please pick one of these Buddies.");
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Start using Bridge" })).toBeEnabled();
  });

  it("links with a helper's code and fills in the name they gave", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ link_id: "l1", other_name: "Sam", name: "Jordan" }), { status: 200 }));
    render(<WelcomeScreen data={data()} />);
    fireEvent.click(screen.getByRole("button", { name: "I have a code from my helper" }));
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "abc234" } });
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    expect(await screen.findByText(/You're linked with Sam/)).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveValue("Jordan");
    expect(fetchMock).toHaveBeenCalledWith("/api/links/redeem", expect.objectContaining({ body: JSON.stringify({ code: "ABC234" }) }));
  });
});
