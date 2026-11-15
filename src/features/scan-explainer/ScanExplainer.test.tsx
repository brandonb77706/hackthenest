import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ScanExplainer } from "./ScanExplainer";
vi.mock("@/components/bridge/Buddy", () => ({ Buddy: () => <span>Buddy</span> }));
vi.mock("@/components/ReadAloudButton", () => ({ ReadAloudButton: ({ label }: { label: string }) => <button>{label}</button> }));
vi.mock("@/lib/voice/player", () => ({ stop: vi.fn() }));
it("lets a person navigate and exit without losing important details", async () => {
  const user = userEvent.setup(); const exit = vi.fn();
  render(<ScanExplainer result={{ what_it_is: "A letter", summary: "Your application was received.", actions: [], deadlines: [{ title: "Reply", date: "2026-12-01" }], confident: true }} onExit={exit} />);
  expect(screen.getByText("A letter")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Your application was received.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Reply: 2026-12-01")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Done" }));
  expect(exit).toHaveBeenCalledOnce();
});
