import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuardianControls } from "./GuardianControls";

afterEach(() => vi.unstubAllGlobals());

const initial = { user_can_edit_routines: true, user_can_edit_contacts: true };

describe("GuardianControls", () => {
  it("starts on and saves a change", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<GuardianControls linkId="l1" name="Jordan" initial={initial} />);
    const routines = screen.getByRole("switch", { name: /Jordan can make and change routines/ });
    expect(routines).toHaveAttribute("aria-checked", "true");
    fireEvent.click(routines);
    expect(routines).toHaveAttribute("aria-checked", "false");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/links/l1", expect.objectContaining({ body: JSON.stringify({ user_can_edit_routines: false }) })),
    );
  });

  it("puts the switch back if saving fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    render(<GuardianControls linkId="l1" name="Jordan" initial={initial} />);
    const contacts = screen.getByRole("switch", { name: /Jordan can add and change trusted contacts/ });
    fireEvent.click(contacts);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save that");
    expect(contacts).toHaveAttribute("aria-checked", "true");
  });
});
