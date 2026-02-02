const GENERATIVE_UI_KEY = "gen_ui_enabled";

export function getGenerativeUIEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(GENERATIVE_UI_KEY);
  if (stored === null) return true;
  return stored === "true";
}

export function setGenerativeUIEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GENERATIVE_UI_KEY, String(enabled));
}
