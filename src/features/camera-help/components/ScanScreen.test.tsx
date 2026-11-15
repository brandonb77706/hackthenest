import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CameraHelpResponse } from "@/lib/ai/prompts/cameraHelp";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const play = vi.fn<(text: string) => Promise<void>>(async () => {});
vi.mock("@/lib/voice/player", () => ({ play: (text: string) => play(text), stop: vi.fn() }));

import { readAloudText, ScanScreen, shortDate } from "./ScanScreen";

const bill: CameraHelpResponse = {
  what_it_is: "Electric bill from DTE.",
  summary: "This is your electric bill for October. You owe $84.12.",
  actions: ["Pay $84.12 by November 28.", "Pay online or by phone.", "Keep this paper until it's paid."],
  deadlines: [{ title: "Pay electric bill", date: "2026-11-28" }],
  confident: true,
};

const prepare = vi.fn(async () => ({ data: btoa("small photo"), mime: "image/jpeg" as const }));
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ result: bill }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const photo = () => new File(["x"], "bill.jpg", { type: "image/jpeg" });
const choose = (testId: string) => fireEvent.change(screen.getByTestId(testId), { target: { files: [photo()] } });

describe("ScanScreen", () => {
  it("starts with Take picture and Choose a photo", () => {
    render(<ScanScreen prepare={prepare} />);
    expect(screen.getByText("Take a picture of a letter, bill, or form.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take picture" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose a photo" })).toBeInTheDocument();
    expect(screen.getByTestId("camera-input")).toHaveAttribute("capture", "environment");
  });

  it("opens the camera when Take picture is tapped", async () => {
    const user = userEvent.setup();
    render(<ScanScreen prepare={prepare} />);
    const click = vi.spyOn(screen.getByTestId("camera-input"), "click");
    await user.click(screen.getByRole("button", { name: "Take picture" }));
    expect(click).toHaveBeenCalled();
  });

  it("reads the photo and shows what it is, what to do, and the due date", async () => {
    render(<ScanScreen prepare={prepare} />);
    choose("camera-input");

    const heading = await screen.findByRole("heading", { name: "Electric bill from DTE." });
    // Focus moves to the heading just after it appears.
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText("Important · due Nov 28")).toBeInTheDocument();
    expect(screen.getByText(/You owe \$84.12/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(bill.actions);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/^\/api\/scan\?tz=/);
    expect(JSON.parse(init.body as string)).toEqual({ image: { data: btoa("small photo"), mime: "image/jpeg" } });
    await waitFor(() => expect(play).toHaveBeenCalledWith(`${bill.what_it_is} ${bill.summary}`));
  });

  it("shows 'Reading it for you…' while it waits", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<ScanScreen prepare={prepare} />);
    choose("camera-input");
    expect(await screen.findByRole("status")).toHaveTextContent("Reading it for you…");
  });

  it("'Read it to me' reads everything, including the steps and dates", async () => {
    const user = userEvent.setup();
    render(<ScanScreen prepare={prepare} />);
    choose("photo-input");
    await screen.findByRole("heading", { name: "Electric bill from DTE." });
    await user.click(screen.getByRole("button", { name: "Read it to me" }));
    expect(play).toHaveBeenLastCalledWith(readAloudText(bill));
    expect(readAloudText(bill)).toContain("Here's what to do. 1. Pay $84.12 by November 28.");
    expect(readAloudText(bill)).toContain("Pay electric bill by Nov 28.");
  });

  it("'Walk me through it' goes through the steps one at a time, then comes back", async () => {
    const user = userEvent.setup();
    render(<ScanScreen prepare={prepare} />);
    choose("photo-input");
    await screen.findByRole("heading", { name: "Electric bill from DTE." });
    await user.click(screen.getByRole("button", { name: "Walk me through it" }));

    expect(screen.getByRole("heading", { name: "Pay $84.12 by November 28." })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("heading", { name: "Pay online or by phone." })).toBeInTheDocument();
    // A walkthrough saves nothing: only the scan request was sent.
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Leave" }));
    expect(screen.getByRole("heading", { name: "Electric bill from DTE." })).toBeInTheDocument();
  });

  it("says so when it couldn't read everything", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ result: { ...bill, confident: false, deadlines: [] } }), { status: 200 }));
    render(<ScanScreen prepare={prepare} />);
    choose("photo-input");
    expect(await screen.findByText(/couldn't read all of it/)).toBeInTheDocument();
    expect(screen.queryByText(/Important · due/)).not.toBeInTheDocument();
  });

  it("explains and lets you try again when the AI can't read it", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 502 }));
    render(<ScanScreen prepare={prepare} />);
    choose("photo-input");
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't read that/);
    expect(screen.getByRole("button", { name: "Take picture" })).toBeInTheDocument();
  });

  it("explains when the file isn't a picture", async () => {
    const failing = vi.fn(async () => Promise.reject(new Error("not_image")));
    render(<ScanScreen prepare={failing} />);
    choose("photo-input");
    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't a picture I can read/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("'Scan another' goes back to the start", async () => {
    const user = userEvent.setup();
    render(<ScanScreen prepare={prepare} />);
    choose("photo-input");
    await screen.findByRole("heading", { name: "Electric bill from DTE." });
    await user.click(screen.getByRole("button", { name: "Scan another" }));
    expect(screen.getByRole("button", { name: "Take picture" })).toBeInTheDocument();
  });
});

describe("shortDate", () => {
  it("turns a date into a short one, and leaves odd input alone", () => {
    expect(shortDate("2026-11-28")).toBe("Nov 28");
    expect(shortDate("soon")).toBe("soon");
  });
});
