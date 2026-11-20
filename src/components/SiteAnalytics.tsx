"use client";

import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { ConsentAnalytics } from "@/components/CookieConsent";
import { Tracker } from "@/components/Tracker";

export function SiteAnalytics() {
  return (
    <ConsentAnalytics>
      {(allowed) =>
        allowed ? (
          <>
            <Analytics
              beforeSend={(event) => {
                if (event.url.includes("/dashboard")) return null;
                return event;
              }}
            />
            <Suspense fallback={null}>
              <Tracker />
            </Suspense>
          </>
        ) : null
      }
    </ConsentAnalytics>
  );
}
