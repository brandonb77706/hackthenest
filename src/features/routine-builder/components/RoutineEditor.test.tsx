import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RoutineInput } from "../routineInput";
import { RoutineEditor, type SaveResult } from "./RoutineEditor";

const routine = (overrides: Partial<RoutineInput> = {}): RoutineInput => ({
  title: "Take medicine",
  goal: "",
  days: ["mon", "wed"],
  start_time: "08:00",
  steps: [
    { text: "Get your pill box", minutes: 1 },
    { text: "Take your pill", minutes: 2 },
  ],
  ...overrides,
});

function setup(initial = routine(), onSave = vi.fn(async (): Promise<SaveResult> => ({ ok: true }))) {
  const user = userEvent.setup();
  render(<RoutineEditor initial={initial} heading="New routine" onSave={onSave} />);
  return { user, onSave };
}

const stepInputs = () => screen.getAllByLabelText(/^Step \d+$/) as HTMLInputElement[];

describe("RoutineEditor: steps screen", () => {
  it("shows the routine's name and steps in order", () => {
    setup();
    expect(screen.getByRole("heading", { name: "New routine" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Take medicine");
    expect(stepInputs().map((i) => i.value)).toEqual(["Get your pill box", "Take your pill"]);
  });

  it("adds, edits, and removes steps", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "+ Add a step" }));
    await user.type(stepInputs()[2], "Put the box away");
    await user.click(screen.getByRole("button", { name: "Remove step 1" }));
    expect(stepInputs().map((i) => i.value)).toEqual(["Take your pill", "Put the box away"]);
  });

  it("moves steps with the up and down buttons", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Move step 2 up" }));
    expect(stepInputs().map((i) => i.value)).toEqual(["Take your pill", "Get your pill box"]);
    expect(screen.getByRole("button", { name: "Move step 1 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move step 2 down" })).toBeDisabled();
  });

  it("won't remove the last step", () => {
    setup(routine({ steps: [{ text: "Only", minutes: 1 }] }));
    expect(screen.getByRole("button", { name: "Remove step 1" })).toBeDisabled();
  });

  it("explains what's missing instead of moving on", async () => {
    const { user } = setup(routine({ title: "", steps: [{ text: "", minutes: 5 }] }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Add a name for this routine.")).toBeInTheDocument();
    expect(screen.getByText("Write what to do in this step.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("heading", { name: "When do you do this?" })).not.toBeInTheDocument();
  });
});

describe("RoutineEditor: schedule screen", () => {
  it("picks days and time, then saves the whole routine", async () => {
    const { user, onSave } = setup();
    await user.click(screen.getByRole("button", { name: "Next" }));

    const heading = screen.getByRole("heading", { name: "When do you do this?" });
    expect(heading).toHaveFocus();

    expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Monday" }));
    await user.click(screen.getByRole("button", { name: "Friday" }));
    const time = screen.getByLabelText("Time");
    await user.clear(time);
    await user.type(time, "09:30");

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({
      title: "Take medicine",
      goal: "",
      days: ["wed", "fri"],
      start_time: "09:30",
      steps: [
        { text: "Get your pill box", minutes: 1 },
        { text: "Take your pill", minutes: 2 },
      ],
    });
  });

  it("'Every day' turns all days on and off", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByLabelText("Every day"));
    const days = within(screen.getByRole("group", { name: "Days" })).getAllByRole("button");
    expect(days.every((d) => d.getAttribute("aria-pressed") === "true")).toBe(true);
    await user.click(screen.getByLabelText("Every day"));
    expect(days.every((d) => d.getAttribute("aria-pressed") === "false")).toBe(true);
  });

  it("needs at least one day before saving", async () => {
    const { user, onSave } = setup(routine({ days: ["mon"] }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Monday" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Pick at least one day.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows a friendly message when saving fails", async () => {
    const { user } = setup(routine(), vi.fn(async () => ({ ok: false }) as SaveResult));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't save/);
  });

  it("keeps the person's work when going back to the steps", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Back to steps" }));
    expect(stepInputs().map((i) => i.value)).toEqual(["Get your pill box", "Take your pill"]);
  });
});

describe("RoutineEditor: delete", () => {
  it("asks before deleting, and only shows when editing", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => {});
    const { unmount } = render(
      <RoutineEditor initial={routine()} heading="Edit routine" onSave={vi.fn()} onDelete={onDelete} />,
    );
    await user.click(screen.getByRole("button", { name: "Delete this routine" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete this routine" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete it" }));
    expect(onDelete).toHaveBeenCalledOnce();
    unmount();

    setup();
    expect(screen.queryByRole("button", { name: "Delete this routine" })).not.toBeInTheDocument();
  });
});
