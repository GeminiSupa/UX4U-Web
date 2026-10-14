export const CONSENT_KEY = "ux4u-consent";

export type ConsentChoice = "accepted" | "rejected";

export type ConsentState = {
  analytics: boolean;
  updatedAt: string;
};

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (typeof parsed.analytics !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice) {
  const state: ConsentState = {
    analytics: choice === "accepted",
    updatedAt: new Date().toISOString()
  };
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("ux4u-consent", { detail: state }));
  return state;
}
