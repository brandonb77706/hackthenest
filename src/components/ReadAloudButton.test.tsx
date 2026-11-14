import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetPlayer } from "@/lib/voice/player";
import { ReadAloudButton } from "./ReadAloudButton";

// jsdom has no audio or speech, so stand in for both.
const audioPlay = vi.fn(async () => {});
class FakeAudio {
  onended: (() => void) | null = null;
  constructor(public src: string) {
    audios.push(this);
  }
  play = audioPlay;
  pause = vi.fn();
}
let audios: FakeAudio[] = [];
const speechSpeak = vi.fn();

beforeEach(() => {
  audios = [];
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("speechSynthesis", { speak: speechSpeak, cancel: vi.fn() });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      rate = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    },
  );
  URL.createObjectURL = vi.fn(() => "blob:audio");
});

afterEach(() => {
  resetPlayer();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ReadAloudButton", () => {
  it("plays ElevenLabs audio from /api/speak", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ReadAloudButton text="Get your pill box" label="Read step 1 aloud" />);

    await user.click(screen.getByRole("button", { name: "Read step 1 aloud" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/speak", expect.objectContaining({ method: "POST" }));
    await waitFor(() => expect(audioPlay).toHaveBeenCalledOnce());
    expect(speechSpeak).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Stop reading" })).toBeInTheDocument();

    act(() => audios[0].onended?.());
    expect(screen.getByRole("button", { name: "Read step 1 aloud" })).toBeInTheDocument();
  });

  it("uses the browser's voice when ElevenLabs is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 502 })));
    const user = userEvent.setup();
    render(<ReadAloudButton text="Take your pill" />);

    await user.click(screen.getByRole("button", { name: "Read aloud" }));

    await waitFor(() => expect(speechSpeak).toHaveBeenCalledOnce());
    expect(speechSpeak.mock.calls[0][0]).toMatchObject({ text: "Take your pill", rate: 0.9 });
  });

  it("uses the browser's voice when there's no internet", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    const user = userEvent.setup();
    render(<ReadAloudButton text="Take your pill" />);
    await user.click(screen.getByRole("button", { name: "Read aloud" }));
    await waitFor(() => expect(speechSpeak).toHaveBeenCalledOnce());
  });

  it("doesn't fetch the same step twice", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ReadAloudButton text="Brush your teeth" />);

    await user.click(screen.getByRole("button", { name: "Read aloud" }));
    await waitFor(() => expect(audios).toHaveLength(1));
    act(() => audios[0].onended?.());
    await user.click(screen.getByRole("button", { name: "Read aloud" }));

    await waitFor(() => expect(audioPlay).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("stops when tapped again", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })));
    const user = userEvent.setup();
    render(<ReadAloudButton text="Brush your teeth" />);
    await user.click(screen.getByRole("button", { name: "Read aloud" }));
    await user.click(await screen.findByRole("button", { name: "Stop reading" }));
    await waitFor(() => expect(audios).toHaveLength(1));
    expect(audios[0].pause).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Read aloud" })).toBeInTheDocument();
  });

  it("is disabled when there's nothing to read", () => {
    render(<ReadAloudButton text="   " />);
    expect(screen.getByRole("button", { name: "Read aloud" })).toBeDisabled();
  });
});
