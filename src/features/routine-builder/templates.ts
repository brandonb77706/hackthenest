// Quick start routines. One tap, no AI, always work.

import { WEEKDAYS } from "@/lib/types";
import type { RoutineInput } from "./routineInput";

export interface RoutineTemplate {
  /** Used in the URL: /routines/new/<id> */
  id: string;
  label: string;
  routine: RoutineInput;
}

const everyDay = [...WEEKDAYS];
const weekdays = WEEKDAYS.filter((d) => d !== "sat" && d !== "sun");

export const BLANK_TEMPLATE_ID = "blank";

export const TEMPLATES: RoutineTemplate[] = [
  {
    id: "take-medicine",
    label: "Take medicine",
    routine: {
      title: "Take medicine",
      tone: "sea",
      remind: true,
      goal: "",
      days: everyDay,
      start_time: "08:00",
      steps: [
        { text: "Get your pill box", minutes: 1 },
        { text: "Pour a glass of water", minutes: 1 },
        { text: "Take your medicine with water", minutes: 2 },
      ],
    },
  },
  {
    id: "morning",
    label: "Morning",
    routine: {
      title: "Morning",
      tone: "gold",
      remind: true,
      goal: "",
      days: everyDay,
      start_time: "07:30",
      steps: [
        { text: "Get out of bed", minutes: 2 },
        { text: "Use the bathroom", minutes: 5 },
        { text: "Brush your teeth", minutes: 3 },
        { text: "Get dressed", minutes: 10 },
        { text: "Eat breakfast", minutes: 15 },
      ],
    },
  },
  {
    id: "get-ready-for-work",
    label: "Get ready for work",
    routine: {
      title: "Get ready for work",
      tone: "orange",
      remind: true,
      goal: "",
      days: weekdays,
      start_time: "08:00",
      steps: [
        { text: "Put on your work clothes", minutes: 10 },
        { text: "Pack your lunch", minutes: 5 },
        { text: "Check you have keys, phone, and wallet", minutes: 2 },
        { text: "Leave for work", minutes: 1 },
      ],
    },
  },
  {
    id: "bedtime",
    label: "Bedtime",
    routine: {
      title: "Bedtime",
      tone: "teal",
      remind: true,
      goal: "",
      days: everyDay,
      start_time: "21:30",
      steps: [
        { text: "Put on your pajamas", minutes: 5 },
        { text: "Brush your teeth", minutes: 3 },
        { text: "Plug in your phone", minutes: 1 },
        { text: "Turn off the lights", minutes: 1 },
      ],
    },
  },
];

const BLANK: RoutineInput = {
  title: "",
  goal: "",
  tone: "teal",
  remind: true,
  days: everyDay,
  start_time: "08:00",
  steps: [{ text: "", minutes: 5 }],
};

/** A fresh copy of a template's routine, or null if the id is unknown. */
export function startingRoutine(templateId: string): RoutineInput | null {
  if (templateId === BLANK_TEMPLATE_ID) return structuredClone(BLANK);
  const template = TEMPLATES.find((t) => t.id === templateId);
  return template ? structuredClone(template.routine) : null;
}
