const storageKey = "prelude:sound-preference";
let preference: "enabled" | "muted" | null = null;
let loaded = false;
export const soundPreferenceEvent = "prelude:sound-enabled";

function readPreference() {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "enabled" || saved === "muted") preference = saved;
    } catch {
      // Storage may be blocked; retain the choice for this page session.
    }
  }
  return preference;
}

export function hasSoundPreference() { return readPreference() !== null; }
export function isSoundEnabled() { return readPreference() === "enabled"; }
export function saveSoundPreference(enabled: boolean) {
  preference = enabled ? "enabled" : "muted";
  loaded = true;
  try {
    window.localStorage.setItem(storageKey, preference);
  } catch {
    // The in-memory preference still applies when storage is unavailable.
  }
  window.dispatchEvent(new Event(soundPreferenceEvent));
}
