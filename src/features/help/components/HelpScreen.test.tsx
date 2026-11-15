import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeakPhrase, TrustedContact } from "@/lib/types";

const play = vi.fn<(text: string) => Promise<void>>(async () => {});
vi.mock("@/lib/voice/player", () => ({ play: (text: string) => play(text), stop: vi.fn() }));

import { HelpScreen } from "./HelpScreen";

const sam: TrustedContact = {
  id: "c1",
  user_id: "u1",
  name: "Sam",
  method: "sms",
  contact: "+15550100142",
  relation: "Your brother",
  can_see_routines: false,
  can_get_lost_alerts: true,
  can_get_stuck_alerts: false,
  added_by: null,
};
const phrases: SpeakPhrase[] = [
  { id: "p1", user_id: "u1", text: "I have autism. I need a moment to answer.", audio_url: null, order: 0 },
  { id: "p2", user_id: "u1", text: "Please write it down for me.", audio_url: null, order: 1 },
  { id: "p3", user_id: "u1", text: "Third one.", audio_url: null, order: 2 },
];

let contacts: TrustedContact[];
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  contacts = [sam];
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/contacts" && !init?.method) return new Response(JSON.stringify({ contacts }), { status: 200 });
    if (url === "/api/phrases" && !init?.method) return new Response(JSON.stringify({ phrases }), { status: 200 });
    if (url === "/api/phrases" && init?.method === "POST") {
      const { text } = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ phrase: { id: "p9", user_id: "u1", text, audio_url: null, order: 9 } }), { status: 201 });
    }
    if (url === "/api/contacts" && init?.method === "POST") {
      const body = JSON.parse(init.body as string);
      contacts = [{ ...body, id: "c2", user_id: "u1" }];
      return new Response(JSON.stringify({ contact: contacts[0] }), { status: 201 });
    }
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    return new Response("{}", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const dial = (dialog: HTMLElement) => within(dialog).getByRole("link", { name: "Yes, call" }).getAttribute("href");

describe("Help screen", () => {
  it("shows the main choices with the first trusted contact", async () => {
    render(<HelpScreen />);
    expect(await screen.findByRole("button", { name: /Call Sam/ })).toBeInTheDocument();
    expect(screen.getByText("Your brother")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /I'm lost/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Speak for me/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Call 911" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crisis line 988" })).toBeInTheDocument();
  });

  it("asks before calling the contact, and only 'Yes, call' dials", async () => {
    const user = userEvent.setup();
    render(<HelpScreen />);
    await user.click(await screen.findByRole("button", { name: /Call Sam/ }));
    const dialog = screen.getByRole("alertdialog", { name: "Call Sam now?" });
    expect(dial(dialog)).toBe("tel:+15550100142");
    expect(screen.queryAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("tel:"))).toHaveLength(1);
    await user.click(within(dialog).getByRole("button", { name: "No, go back" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("with more than one contact, asks who to call, then asks before calling", async () => {
    const alex = { ...sam, id: "c2", name: "Alex", contact: "+15550100199", relation: "Your job coach" };
    const emailOnly = { ...sam, id: "c3", name: "Pat", method: "email" as const, contact: "pat@example.com" };
    contacts = [sam, alex, emailOnly];
    const user = userEvent.setup();
    render(<HelpScreen />);

    await user.click(await screen.findByRole("button", { name: /Call a trusted contact/ }));
    expect(screen.getByText("Pick who to call (2 people)")).toBeInTheDocument();
    const picker = screen.getByRole("group", { name: "Who do you want to call?" });
    // Only contacts with a phone number can be called.
    expect(within(picker).queryByRole("button", { name: /Pat/ })).not.toBeInTheDocument();
    expect(screen.queryAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("tel:"))).toHaveLength(0);

    await user.click(within(picker).getByRole("button", { name: /Alex/ }));
    const dialog = screen.getByRole("alertdialog", { name: "Call Alex now?" });
    expect(dial(dialog)).toBe("tel:+15550100199");

    // Going back returns to the list, not straight out.
    await user.click(within(dialog).getByRole("button", { name: "No, go back" }));
    expect(screen.getByRole("group", { name: "Who do you want to call?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Never mind" }));
    expect(screen.queryByRole("group", { name: "Who do you want to call?" })).not.toBeInTheDocument();
  });

  it("with exactly one callable contact, goes straight to asking about them", async () => {
    contacts = [sam, { ...sam, id: "c3", name: "Pat", method: "email", contact: "pat@example.com" }];
    const user = userEvent.setup();
    render(<HelpScreen />);
    await user.click(await screen.findByRole("button", { name: /Call Sam/ }));
    expect(screen.getByRole("alertdialog", { name: "Call Sam now?" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Who do you want to call?" })).not.toBeInTheDocument();
  });

  it("asks before calling 911 and 988", async () => {
    const user = userEvent.setup();
    render(<HelpScreen />);
    await user.click(await screen.findByRole("button", { name: "Call 911" }));
    expect(dial(screen.getByRole("alertdialog", { name: "Call 911 now?" }))).toBe("tel:911");
    await user.click(screen.getByRole("button", { name: "No, go back" }));

    await user.click(screen.getByRole("button", { name: "Crisis line 988" }));
    expect(dial(screen.getByRole("alertdialog", { name: /988/ }))).toBe("tel:988");
  });

  it("never dials without asking: no tel: links until a confirm is open", async () => {
    render(<HelpScreen />);
    await screen.findByRole("button", { name: /Call Sam/ });
    expect(screen.queryAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("tel:"))).toHaveLength(0);
  });

  it("offers to add a contact when there isn't one", async () => {
    contacts = [];
    const user = userEvent.setup();
    render(<HelpScreen />);
    await user.click(await screen.findByRole("button", { name: /Add a contact/ }));
    expect(screen.getByRole("heading", { name: "Add a trusted contact" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Where I am/ })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: /stuck/ })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: /finish a routine/ })).not.toBeChecked();
  });

  it("saves a new contact with the sharing the person chose", async () => {
    contacts = [];
    const user = userEvent.setup();
    render(<HelpScreen />);
    await user.click(await screen.findByRole("button", { name: /Add a contact/ }));
    await user.type(screen.getByLabelText("Their name"), "Sam");
    await user.type(screen.getByLabelText("Phone number"), "555 010 0142");
    await user.click(screen.getByRole("switch", { name: /Where I am/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    const post = fetchMock.mock.calls.find(([u, i]) => u === "/api/contacts" && (i as RequestInit)?.method === "POST")!;
    expect(JSON.parse((post[1] as RequestInit).body as string)).toMatchObject({
      name: "Sam",
      method: "sms",
      contact: "5550100142",
      can_get_lost_alerts: true,
      can_get_stuck_alerts: false,
      can_see_routines: false,
    });
    expect(await screen.findByRole("heading", { name: "Trusted contacts" })).toBeInTheDocument();
    expect(screen.getByText("Sam")).toBeInTheDocument();
  });

  it("explains what's missing instead of saving", async () => {
    contacts = [];
    const user = userEvent.setup();
    render(<HelpScreen />);
    await user.click(await screen.findByRole("button", { name: /Add a contact/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Add their name.")).toBeInTheDocument();
    expect(screen.getByText("Add their phone number.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, i]) => (i as RequestInit)?.method === "POST")).toHaveLength(0);
  });

  it("plays a quick message out loud", async () => {
    const user = userEvent.setup();
    render(<HelpScreen />);
    await user.click(await screen.findByRole("button", { name: /I have autism/ }));
    expect(play).toHaveBeenCalledWith("I have autism. I need a moment to answer.");
    expect(screen.queryByRole("button", { name: "Third one." })).not.toBeInTheDocument();
  });
});

describe("Speak for me", () => {
  it("says typed text, shows it big, and saves it as a message", async () => {
    const user = userEvent.setup();
    render(<HelpScreen />);
    await user.click(await screen.findByRole("button", { name: /Speak for me/ }));
    expect(screen.getByRole("heading", { name: "Speak for me" })).toHaveFocus();

    await user.type(screen.getByLabelText("What do you want to say?"), "Where is the bus stop?");
    await user.click(screen.getByRole("button", { name: "Read it out loud" }));
    expect(play).toHaveBeenCalledWith("Where is the bus stop?");

    await user.click(screen.getByRole("button", { name: "Show big" }));
    expect(screen.getByRole("dialog", { name: "Message shown big" })).toHaveTextContent("Where is the bus stop?");
    await user.click(screen.getByRole("button", { name: "Done" }));

    await user.click(screen.getByRole("button", { name: "+ Save as a message" }));
    expect(await screen.findByRole("button", { name: "Where is the bus stop?" })).toBeInTheDocument();
  });

  it("plays and removes saved messages", async () => {
    const user = userEvent.setup();
    render(<HelpScreen />);
    await user.click(await screen.findByRole("button", { name: /Speak for me/ }));
    await user.click(screen.getByRole("button", { name: "Please write it down for me." }));
    expect(play).toHaveBeenCalledWith("Please write it down for me.");
    await user.click(screen.getByRole("button", { name: "Remove message: Third one." }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Third one." })).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/phrases/p3", expect.objectContaining({ method: "DELETE" }));
  });
});
