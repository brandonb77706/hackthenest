// Look-and-feel settings kept on this device so every screen can use them
// right away (in the browser; the server always sees the defaults): the color scheme, the Buddy on the tab bar, and which Buddy.
// The real values live on the profile; screens that load the profile (Today,
// Me) call syncSettings() so this device catches up.

import { DEFAULT_COLOR_SCHEME, isColorScheme, type ColorSchemeId } from "./theme";

export interface DeviceSettings {
  colorScheme: ColorSchemeId;
  showBuddy: boolean;
  /** Name of the equipped Buddy, like "Fox" */
  buddyName: string;
  /** Reminder 10 minutes before a routine */
  reminders: boolean;
  /** Gentle nudge 10 minutes after, if the routine hasn't started */
  lateNudges: boolean;
  /** A soft chime with each reminder */
  chime: boolean;
}

export const DEFAULT_BUDDY_NAME = "Fox";
const KEY = "bridge-settings";
export const DEFAULT_SETTINGS: DeviceSettings = {
  colorScheme: DEFAULT_COLOR_SCHEME,
  showBuddy: true,
  buddyName: DEFAULT_BUDDY_NAME,
  reminders: true,
  lateNudges: true,
  chime: false,
};

let cached: DeviceSettings | null = null;
const listeners = new Set<() => void>();

function read(): DeviceSettings {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<DeviceSettings>;
    return {
      colorScheme: isColorScheme(raw.colorScheme) ? raw.colorScheme : DEFAULT_SETTINGS.colorScheme,
      showBuddy: raw.showBuddy !== false,
      buddyName: typeof raw.buddyName === "string" && raw.buddyName.trim() ? raw.buddyName : DEFAULT_BUDDY_NAME,
      reminders: raw.reminders !== false,
      lateNudges: raw.lateNudges !== false,
      chime: raw.chime === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function getSettings(): DeviceSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  cached ??= read();
  return cached;
}

export function getServerSettings(): DeviceSettings {
  return DEFAULT_SETTINGS;
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Puts the color scheme on the page. */
export function applyColorScheme(scheme: ColorSchemeId): void {
  if (typeof document !== "undefined") document.documentElement.dataset.theme = scheme;
}

export function updateSettings(patch: Partial<DeviceSettings>): void {
  const next = { ...getSettings(), ...patch };
  cached = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private browsing or storage turned off: still works for this visit.
  }
  applyColorScheme(next.colorScheme);
  listeners.forEach((l) => l());
}

/** Brings this device in line with the profile, e.g. after signing in on a new phone. */
export function syncSettings(profile: { color_scheme?: string; show_buddy?: boolean; buddy_name?: string | null }): void {
  const current = getSettings();
  const next: DeviceSettings = {
    ...current,
    colorScheme: isColorScheme(profile.color_scheme) ? profile.color_scheme : current.colorScheme,
    showBuddy: typeof profile.show_buddy === "boolean" ? profile.show_buddy : current.showBuddy,
    buddyName: profile.buddy_name || current.buddyName,
  };
  if (next.colorScheme !== current.colorScheme || next.showBuddy !== current.showBuddy || next.buddyName !== current.buddyName) {
    updateSettings(next);
  }
}

/** For tests. */
export function resetSettingsCache(): void {
  cached = null;
}

/**
 * Runs before the page paints, so the saved color scheme shows with no flash
 * of baby blue. Kept tiny and dependency-free; it's inlined in the root layout.
 */
export const THEME_BOOT_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("${KEY}")||"{}");if(s.colorScheme)document.documentElement.dataset.theme=s.colorScheme}catch(e){}`;
