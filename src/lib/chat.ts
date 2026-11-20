export const CHANNELS = ["general", "projects", "marketing", "random"] as const;
export type Channel = (typeof CHANNELS)[number];
