// The routine editor's state changes, kept out of the component so they're easy to test.

import { WEEKDAYS, type Weekday } from "@/lib/types";
import { LIMITS, type RoutineInput, type StepInput } from "./routineInput";

/** Each step gets a stable key so React keeps focus and screen reader position when steps move. */
export interface EditorStep extends StepInput {
  key: string;
}

export interface EditorState extends Omit<RoutineInput, "steps"> {
  steps: EditorStep[];
}

export type EditorAction =
  | { type: "setTitle"; title: string }
  | { type: "setStepText"; index: number; text: string }
  | { type: "setStepMinutes"; index: number; minutes: number }
  | { type: "addStep" }
  | { type: "removeStep"; index: number }
  | { type: "moveStep"; index: number; direction: "up" | "down" }
  | { type: "toggleDay"; day: Weekday }
  | { type: "setEveryDay"; on: boolean }
  | { type: "setTime"; time: string };

let nextKey = 0;
const newKey = () => `step-${++nextKey}`;

export function toEditorState(routine: RoutineInput): EditorState {
  return { ...routine, steps: routine.steps.map((s) => ({ ...s, key: newKey() })) };
}

export function toRoutineInput(state: EditorState): RoutineInput {
  return {
    ...state,
    steps: state.steps.map((s) => ({ ...(s.id ? { id: s.id } : {}), text: s.text, minutes: s.minutes })),
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const updateStep = (index: number, change: Partial<StepInput>) => ({
    ...state,
    steps: state.steps.map((s, i) => (i === index ? { ...s, ...change } : s)),
  });

  switch (action.type) {
    case "setTitle":
      return { ...state, title: action.title };
    case "setStepText":
      return updateStep(action.index, { text: action.text });
    case "setStepMinutes":
      return updateStep(action.index, { minutes: action.minutes });
    case "addStep":
      if (state.steps.length >= LIMITS.stepsMax) return state;
      return { ...state, steps: [...state.steps, { key: newKey(), text: "", minutes: 5 }] };
    case "removeStep":
      // Keep at least one step so there's always something to type in.
      if (state.steps.length <= 1) return state;
      return { ...state, steps: state.steps.filter((_, i) => i !== action.index) };
    case "moveStep": {
      const target = action.direction === "up" ? action.index - 1 : action.index + 1;
      if (target < 0 || target >= state.steps.length) return state;
      const steps = [...state.steps];
      [steps[action.index], steps[target]] = [steps[target], steps[action.index]];
      return { ...state, steps };
    }
    case "toggleDay": {
      const has = state.days.includes(action.day);
      const days = has ? state.days.filter((d) => d !== action.day) : [...state.days, action.day];
      return { ...state, days: WEEKDAYS.filter((d) => days.includes(d)) };
    }
    case "setEveryDay":
      return { ...state, days: action.on ? [...WEEKDAYS] : [] };
    case "setTime":
      return { ...state, start_time: action.time };
  }
}
