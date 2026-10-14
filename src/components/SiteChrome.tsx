import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MarqueeBanner } from "@/components/MarqueeBanner";
import type { ReactNode } from "react";

export function SiteChrome({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <>
      <div className="sticky top-0 z-30">
        <MarqueeBanner />
        <Header />
      </div>
      {children}
      {footer ? <Footer /> : null}
    </>
  );
}
