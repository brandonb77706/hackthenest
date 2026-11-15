import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSettings, resetSettingsCache } from "@/lib/settings";
import type { TrustedContact } from "@/lib/types";
import type { MeData } from "../service";
import { buddyChoices } from "../summary";
import { MeScreen } from "./MeScreen";

// Guardians load their own data; GuardiansSection.test.tsx covers them.
vi.mock("@/features/guardians/components/GuardiansSection", () => ({ GuardiansSection: () => null }));

const sam: TrustedContact = {
  id: "c1",
  user_id: "u1",
  name: "Sam",
  method: "sms",
  contact: "+15550100142",
  relation: "Your brother",
  can_see_routines: false,
  can_get_lost_alerts: false,
  can_get_stuck_alerts: false,
  added_by: null,
};
const catalog = [
  { id: "fox", name: "Fox", unlock_type: "starter" as const, price: null, streak_required: null },
  { id: "robot", name: "Robot", unlock_type: "starter" as const, price: null, streak_required: null },
  { id: "cat", name: "Astronaut cat", unlock_type: "shop" as const, price: 100, streak_required: null },
];

function data(overrides: Partial<MeData> = {}): MeData {
  return {
    summary: {
      name: "Jordan",
      tokens: 25,
      buddyName: "Fox",
      nextReward: { label: "Next reward: Astronaut cat", percent: 25, detail: "75 coins more to get Astronaut cat." },
    },
    buddies: buddyChoices(catalog, ["fox"], "fox"),
    contacts: [sam],
    settings: { color_scheme: "blue", show_buddy: true, buddy_name: "Fox" },
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  resetSettingsCache();
  fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const bodyOf = (url: string) => {
  const call = fetchMock.mock.calls.find(([u]) => u === url) as [string, RequestInit] | undefined;
  return call ? JSON.parse(call[1].body as string) : undefined;
};

describe("Me", () => {
  it("shows the name, coins, Buddy, and progress to the next reward", async () => {
    const user = userEvent.setup();
    render(<MeScreen data={data()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Jordan" })).toBeInTheDocument();
    expect(screen.getByText("25 coins · Buddy: Fox")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Badges and rewards/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Badges and rewards" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Next reward: Astronaut cat" })).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByText("75 coins more to get Astronaut cat.")).toBeInTheDocument();
  });

  it("still has a heading before the profile exists, and no reward bar when there's none", () => {
    render(<MeScreen data={data({ summary: { name: "", tokens: 0, buddyName: null, nextReward: null } })} />);
    expect(screen.getByRole("heading", { level: 1, name: "Me" })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("lists trusted contacts by name with a short summary of what each can see", () => {
    const alex = { ...sam, id: "c2", name: "alex", relation: "", can_get_lost_alerts: true, can_get_stuck_alerts: true };
    const zoe = { ...sam, id: "c3", name: "Zoe", relation: "Friend" };
    render(<MeScreen data={data({ contacts: [zoe, sam, alex] })} />);
    const rows = screen.getAllByRole("button", { name: /Change what they can see/ });
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("alex"),
      expect.stringContaining("Sam"),
      expect.stringContaining("Zoe"),
    ]);
    expect(rows[0]).toHaveTextContent("Sees: your location when you're lost · when you're stuck");
    expect(rows[1]).toHaveTextContent("Sees nothing");
    expect(screen.queryAllByRole("switch", { name: /My location/ })).toHaveLength(0);
  });

  it("opens a popup to change what one person can see, and saves each switch", async () => {
    const user = userEvent.setup();
    render(<MeScreen data={data()} />);
    await user.click(screen.getByRole("button", { name: /Sam, Your brother/ }));

    const dialog = screen.getByRole("dialog", { name: "What Sam can see" });
    expect(within(dialog).getByRole("heading", { name: "What Sam can see" })).toHaveFocus();
    const lost = within(dialog).getByRole("switch", { name: /My location/ });
    expect(lost).not.toBeChecked();
    await user.click(lost);
    expect(lost).toBeChecked();
    expect(bodyOf("/api/contacts/c1")).toMatchObject({ name: "Sam", contact: "+15550100142", can_get_lost_alerts: true, can_see_routines: false });

    await user.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sam, Your brother/ })).toHaveTextContent("Sees: your location when you're lost");
  });

  it("closes the popup with Escape and puts focus back on the person", async () => {
    const user = userEvent.setup();
    render(<MeScreen data={data()} />);
    const row = screen.getByRole("button", { name: /Sam, Your brother/ });
    await user.click(row);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(row).toHaveFocus();
  });

  it("puts a switch back if saving fails", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const user = userEvent.setup();
    render(<MeScreen data={data()} />);
    await user.click(screen.getByRole("button", { name: /Sam, Your brother/ }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("switch", { name: /finish a routine/ }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/Couldn't save/);
    expect(within(dialog).getByRole("switch", { name: /finish a routine/ })).not.toBeChecked();
  });

  it("changes a contact's name or number from the popup", async () => {
    const user = userEvent.setup();
    render(<MeScreen data={data()} />);
    await user.click(screen.getByRole("button", { name: /Sam, Your brother/ }));
    await user.click(screen.getByRole("button", { name: "Change name or number" }));
    expect(screen.getByRole("heading", { name: "Change Sam" })).toBeInTheDocument();
    expect(screen.getByLabelText("Their name")).toHaveValue("Sam");
    expect(screen.getByRole("button", { name: "Remove this contact" })).toBeInTheDocument();
  });

  it("adds a trusted contact from Me", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      url === "/api/contacts" && init?.method === "POST"
        ? new Response(JSON.stringify({ contact: { ...sam, id: "c9", name: "Alex", relation: "" } }), { status: 201 })
        : new Response("{}", { status: 200 }),
    );
    const user = userEvent.setup();
    render(<MeScreen data={data({ contacts: [] })} />);
    expect(screen.getByText(/No one yet/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+ Add a trusted contact" }));
    await user.type(screen.getByLabelText("Their name"), "Alex");
    await user.type(screen.getByLabelText("Phone number"), "555 010 0199");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("button", { name: /Alex\. Sees nothing/ })).toBeInTheDocument();
  });

  it("chooses a starter Buddy, but not a locked one", async () => {
    const user = userEvent.setup();
    render(<MeScreen data={data()} />);
    await user.click(screen.getByRole("button", { name: "Change Buddy" }));
    expect(screen.getByRole("heading", { name: "Choose your Buddy" })).toHaveFocus();

    // Not enough tokens: says how many more, and buys nothing.
    await user.click(screen.getByRole("button", { name: /Astronaut cat, 100 coins, tap to buy/ }));
    const short = screen.getByRole("dialog", { name: "Astronaut cat costs 100 coins" });
    expect(within(short).getByText(/You need 75 coins more/)).toBeInTheDocument();
    await user.click(within(short).getByRole("button", { name: "OK" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Robot, tap to choose/ }));
    expect(bodyOf("/api/me/buddy")).toEqual({ avatar_id: "robot" });
    expect(screen.getByRole("button", { name: /Robot, your Buddy/ })).toHaveAttribute("aria-pressed", "true");
    expect(getSettings().buddyName).toBe("Robot");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("25 coins · Buddy: Robot")).toBeInTheDocument();
  });

  it("changes the color scheme right away and saves it", async () => {
    const user = userEvent.setup();
    render(<MeScreen data={data()} />);
    await user.click(screen.getByRole("button", { name: /Baby blue/ }));
    expect(screen.getByRole("radio", { name: /Baby blue/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /High contrast/ }));

    expect(document.documentElement.dataset.theme).toBe("contrast");
    expect(screen.getByRole("radio", { name: /High contrast/ })).toBeChecked();
    expect(bodyOf("/api/me/settings")).toEqual({ color_scheme: "contrast" });
  });

  it("goes back to the old colors if saving fails", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const user = userEvent.setup();
    render(<MeScreen data={data()} />);
    await user.click(screen.getByRole("button", { name: /Baby blue/ }));
    await user.click(screen.getByRole("radio", { name: /^Calm/ }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("blue"));
    expect(screen.getByRole("alert")).toHaveTextContent(/Couldn't save your colors/);
  });

  it("turns reminders, nudges, and the chime on and off for this phone", async () => {
    const user = userEvent.setup();
    render(<MeScreen data={data()} />);
    const reminders = screen.getByRole("switch", { name: /Routine reminders/ });
    expect(reminders).toBeChecked();
    expect(screen.getByRole("switch", { name: /Sound/ })).not.toBeChecked();
    await user.click(reminders);
    await user.click(screen.getByRole("switch", { name: /Sound/ }));
    expect(getSettings()).toMatchObject({ reminders: false, lateNudges: true, chime: true });
  });

  it("hides the Buddy on the tab bar", async () => {
    const user = userEvent.setup();
    render(<MeScreen data={data()} />);
    await user.click(screen.getByRole("switch", { name: "Show my Buddy on the tab bar" }));
    expect(getSettings().showBuddy).toBe(false);
    expect(bodyOf("/api/me/settings")).toEqual({ show_buddy: false });
  });

  it("hides adding and changing contacts when a guardian manages them, but sharing still works", async () => {
    const user = userEvent.setup();
    render(
      <MeScreen
        data={data({ edit: { routines: { allowed: true, managedBy: [] }, contacts: { allowed: false, managedBy: ["Sam"] } } })}
      />,
    );
    expect(screen.getByText("Sam manages your trusted contacts. Ask Sam to make changes.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Add a trusted contact" })).toBeNull();
    const first = screen.getAllByRole("button", { name: /Change what they can see/ })[0];
    await user.click(first);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "Change name or number" })).toBeNull();
    expect(within(dialog).getAllByRole("switch").length).toBeGreaterThan(0);
  });

  it("buys a shop Buddy with coins, puts it on, and updates the coins", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/me/buddy/buy"
        ? new Response(JSON.stringify({ buddy_name: "Astronaut cat", tokens: 50 }), { status: 200 })
        : new Response("{}", { status: 200 }),
    );
    const user = userEvent.setup();
    render(<MeScreen data={data({ summary: { name: "Jordan", tokens: 150, buddyName: "Fox", nextReward: null } })} />);
    await user.click(screen.getByRole("button", { name: "Change Buddy" }));
    expect(screen.getByText("You have 150 coins.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Astronaut cat, 100 coins, tap to buy/ }));
    const dialog = screen.getByRole("dialog", { name: "Buy Astronaut cat?" });
    expect(within(dialog).getByText(/You'll have 50 coins left/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Not now" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Astronaut cat, 100 coins, tap to buy/ }));
    await user.click(screen.getByRole("button", { name: "Buy for 100 coins" }));
    expect(await screen.findByText("You got Astronaut cat! Astronaut cat is your Buddy now.")).toBeInTheDocument();
    expect(bodyOf("/api/me/buddy/buy")).toEqual({ avatar_id: "cat" });
    expect(screen.getByRole("button", { name: /Astronaut cat, your Buddy/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("You have 50 coins.")).toBeInTheDocument();
    expect(getSettings().buddyName).toBe("Astronaut cat");
  });

  it("keeps the coins and says why when buying fails", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ error: "You need 10 more coins for Astronaut cat. Finish routines to earn more." }), { status: 402 }));
    const user = userEvent.setup();
    render(<MeScreen data={data({ summary: { name: "Jordan", tokens: 150, buddyName: "Fox", nextReward: null } })} />);
    await user.click(screen.getByRole("button", { name: "Change Buddy" }));
    await user.click(screen.getByRole("button", { name: /Astronaut cat, 100 coins, tap to buy/ }));
    await user.click(screen.getByRole("button", { name: "Buy for 100 coins" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("You need 10 more coins");
    expect(screen.getByText("You have 150 coins.")).toBeInTheDocument();
  });

  it("shows fresh coins when new data arrives while the screen stays open (tab switches)", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MeScreen data={data()} />);
    expect(screen.getByText("25 coins · Buddy: Fox")).toBeInTheDocument();
    // Coming back to Me after finishing a routine: Next.js keeps the screen and passes new data.
    rerender(<MeScreen data={data({ summary: { name: "Jordan", tokens: 105, buddyName: "Fox", nextReward: null } })} />);
    expect(screen.getByText("105 coins · Buddy: Fox")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Change Buddy" }));
    expect(screen.getByText("You have 105 coins.")).toBeInTheDocument();
  });
});
