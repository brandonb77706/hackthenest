import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, getSettings, resetSettingsCache, subscribeSettings, syncSettings, THEME_BOOT_SCRIPT, updateSettings } from "./settings";

beforeEach(() => {
  localStorage.clear();
  resetSettingsCache();
  delete document.documentElement.dataset.theme;
});
afterEach(() => resetSettingsCache());

describe("device settings", () => {
  it("starts with baby blue, the Buddy shown, and the fox", () => {
    expect(getSettings()).toEqual({
      colorScheme: "blue",
      showBuddy: true,
      buddyName: "Fox",
      reminders: true,
      lateNudges: true,
      chime: false,
    });
    expect(DEFAULT_SETTINGS.buddyName).toBe("Fox");
  });

  it("saves changes, puts the scheme on the page, and tells listeners", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSettings(listener);
    updateSettings({ colorScheme: "contrast", showBuddy: false });
    expect(document.documentElement.dataset.theme).toBe("contrast");
    expect(getSettings()).toMatchObject({ colorScheme: "contrast", showBuddy: false });
    expect(JSON.parse(localStorage.getItem("bridge-settings")!)).toMatchObject({ colorScheme: "contrast" });
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("keeps reminder choices, with Sound off unless turned on", () => {
    updateSettings({ reminders: false, chime: true });
    resetSettingsCache();
    expect(getSettings()).toMatchObject({ reminders: false, lateNudges: true, chime: true });
  });

  it("ignores bad saved values", () => {
    localStorage.setItem("bridge-settings", JSON.stringify({ colorScheme: "purple", buddyName: "  " }));
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("catches up with the profile, keeping what the profile leaves out", () => {
    syncSettings({ color_scheme: "calm", show_buddy: false, buddy_name: null });
    expect(getSettings()).toMatchObject({ colorScheme: "calm", showBuddy: false, buddyName: "Fox", reminders: true });
    expect(document.documentElement.dataset.theme).toBe("calm");
  });

  it("has a boot script that applies the saved scheme before the page paints", () => {
    localStorage.setItem("bridge-settings", JSON.stringify({ colorScheme: "dyslexia" }));
    new Function(THEME_BOOT_SCRIPT)();
    expect(document.documentElement.dataset.theme).toBe("dyslexia");
  });
});
