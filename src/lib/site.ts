// Must be the domain that actually serves this app in production.
// TODO(owner): point ux4u.online at this Vercel project, then keep SITE_URL as below.
export const SITE_URL = "https://ux4u.online";
export const SITE_NAME = "UX4U";
export const COMPANY_NAME = "UX4U";
export const COMPANY_CITY = "Islamabad";
export const COMPANY_COUNTRY = "Pakistan";
export const COMPANY_JURISDICTION = "Islamabad, Pakistan";
export const COMPANY_EMAIL = "info@ux4u.online";
// TODO(owner): real profile URLs only (LinkedIn, GitHub, X, Google Business Profile).
export const SOCIAL_PROFILES: string[] = [];
export const RESPONSE_TIME: string = "We reply within one working day.";
/** Digits for wa.me (Pakistan mobile 0349… → 92349…). */
export const WHATSAPP: string = "923490554719";
export const WHATSAPP_DISPLAY: string = "0349 0554719";
// TODO(owner): journal bylines — author name + YYYY-MM-DD per slug.
export const POST_BYLINES: Record<string, { author: string; date: string }> = {};
