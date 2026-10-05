// Must be the domain that actually serves this app in production.
// TODO(owner): point ux4u.online at this Vercel project, then keep SITE_URL as below.
export const SITE_URL = "https://ux4u.online";
export const SITE_NAME = "UX4U";
// TODO(owner): real profile URLs only (LinkedIn, GitHub, X, Google Business Profile).
export const SOCIAL_PROFILES: string[] = [];
// TODO(owner): confirmed response-time line, e.g. "We reply within one working day." or leave empty.
export const RESPONSE_TIME: string = "";
// TODO(owner): WhatsApp digits only for wa.me, or leave empty.
export const WHATSAPP: string = "";
// TODO(owner): journal bylines — author name + YYYY-MM-DD per slug.
export const POST_BYLINES: Record<string, { author: string; date: string }> = {};
