"use client";

import { Analytics } from "@vercel/analytics/next";
import { ConsentAnalytics } from "@/components/CookieConsent";

export function SiteAnalytics() {
  return (
    <ConsentAnalytics>
      {(allowed) =>
        allowed ? (
          <Analytics
            beforeSend={(event) => {
              if (event.url.includes("/dashboard")) return null;
              return event;
            }}
          />
        ) : null
      }
    </ConsentAnalytics>
  );
}
