"use client";

import Link from "next/link";
import { useRef, type ReactNode, type MouseEvent } from "react";

export function TiltCard({
  children,
  className = "",
  href,
  as = "div"
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  as?: "div" | "article" | "a";
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(event: MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    node.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg) translateY(-6px) scale(1.02)`;
    node.style.setProperty("--spot-x", `${x * 100}%`);
    node.style.setProperty("--spot-y", `${y * 100}%`);
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = "";
  }

  const content =
    as === "a" && href ? (
      <Link href={href} className="relative z-[1] flex h-full flex-col text-inherit no-underline">
        {children}
      </Link>
    ) : as === "article" ? (
      <article className="relative z-[1] flex h-full flex-col">{children}</article>
    ) : (
      <div className="relative z-[1] flex h-full flex-col">{children}</div>
    );

  return (
    <div ref={ref} className={`tilt-surface h-full ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>
      <span className="tilt-glare" aria-hidden />
      {content}
    </div>
  );
}
