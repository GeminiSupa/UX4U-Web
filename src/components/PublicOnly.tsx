"use client";

import { usePathname } from "next/navigation";

/** Renders children on the public site only, not inside the studio desk. */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path?.startsWith("/dashboard")) return null;
  return <>{children}</>;
}
