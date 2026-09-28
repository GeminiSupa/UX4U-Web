"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel,
  dark = false
}: {
  label: string;
  pendingLabel: string;
  dark?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        dark
          ? "rounded-full bg-ink px-5 py-3 text-sm text-paper disabled:opacity-60"
          : "rounded-full bg-lime px-5 py-3 text-sm font-medium text-ink disabled:opacity-60"
      }
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
