"use client";

import { useId, useState } from "react";

export function InquiryContactFields({ inputClassName }: { inputClassName: string }) {
  const hintId = useId();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <>
      <p id={hintId} className="text-xs text-ink/55">
        Add at least one way for us to reply: email or phone/WhatsApp.
      </p>
      <label className="text-sm">
        Email <span className="text-ink/40">{phone.trim() ? "(optional)" : "(required)"}</span>
        <input
          className={inputClassName}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required={!phone.trim()}
          aria-describedby={hintId}
        />
      </label>
      <label className="text-sm">
        Phone / WhatsApp <span className="text-ink/40">{email.trim() ? "(optional)" : "(required)"}</span>
        <input
          className={inputClassName}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required={!email.trim()}
          minLength={7}
          maxLength={30}
          pattern="[0-9+() .-]{7,30}"
          placeholder="+92 300 1234567"
          aria-describedby={hintId}
        />
      </label>
    </>
  );
}
