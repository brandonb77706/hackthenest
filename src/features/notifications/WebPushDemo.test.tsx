import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { enablePush } from "./pushClient";
import { WebPushDemo } from "./WebPushDemo";

vi.mock("./pushClient", () => ({ enablePush: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it("only enables after a click and copies the subscription", async () => {
  const user = userEvent.setup();
  vi.mocked(enablePush).mockResolvedValue({ toJSON: () => ({ endpoint: "test" }) } as PushSubscription);
  render(<WebPushDemo />);
  expect(enablePush).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Enable notifications" }));
  expect(screen.getByLabelText("Your test subscription (keep this private)")).toHaveValue(JSON.stringify({ endpoint: "test" }, null, 2));
  await user.click(screen.getByRole("button", { name: "Copy test subscription" }));
  expect(await navigator.clipboard.readText()).toContain('"endpoint": "test"');
  expect(screen.getByRole("status")).toHaveTextContent("Copied");
});
it("reports permission failure and enables retry", async () => {
  const user = userEvent.setup();
  vi.mocked(enablePush).mockRejectedValue(new Error("Notifications were not allowed."));
  render(<WebPushDemo />);
  await user.click(screen.getByRole("button", { name: "Enable notifications" }));
  expect(screen.getByRole("status")).toHaveTextContent("not allowed");
  expect(screen.getByRole("button", { name: "Enable notifications" })).toBeEnabled();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
