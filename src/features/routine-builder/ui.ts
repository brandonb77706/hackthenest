// Shared class names for this feature. Big text, high contrast, and tap targets
// of at least 48px (CLAUDE.md product rule 1). Move to src/components/ if other
// features want the same look.

const base =
  "inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-lg font-semibold " +
  "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " +
  "disabled:opacity-60";

export const ui = {
  page: "mx-auto w-full max-w-xl px-4 py-8 text-lg text-zinc-900 dark:text-zinc-50",
  h1: "text-3xl font-bold",
  h2: "text-2xl font-bold",
  primary: `${base} w-full bg-blue-700 text-white hover:bg-blue-800`,
  secondary: `${base} border-2 border-zinc-800 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800`,
  danger: `${base} border-2 border-red-700 bg-white text-red-800 hover:bg-red-50 dark:bg-zinc-900 dark:text-red-300`,
  icon: `${base} min-w-12 px-0 border-2 border-zinc-400 bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-50`,
  label: "block text-lg font-semibold",
  input:
    "mt-1 block min-h-12 w-full rounded-xl border-2 border-zinc-500 bg-white px-3 text-lg text-zinc-900 " +
    "focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 dark:bg-zinc-900 dark:text-zinc-50",
  error: "mt-1 text-lg font-semibold text-red-800 dark:text-red-300",
  card: "rounded-2xl border-2 border-zinc-300 p-4 dark:border-zinc-700",
};
