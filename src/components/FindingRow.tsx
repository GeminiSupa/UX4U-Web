"use client";

import { useState } from "react";
import { ContactLinks } from "@/components/ContactLinks";
import type { MapPlace } from "@/lib/maps";

const field = "w-full min-w-28 border border-ink/15 bg-white px-2 py-1.5 text-xs";

export function SelectAllButton({ startSelected = false }: { startSelected?: boolean }) {
  const [all, setAll] = useState(startSelected);

  return (
    <button
      type="button"
      className="rounded-full border border-ink/15 px-3 py-1 text-sm"
      onClick={(event) => {
        const form = event.currentTarget.closest("form");
        const boxes = form?.querySelectorAll<HTMLInputElement>('input[name="pick"]');
        const next = !all;
        boxes?.forEach((box) => {
          box.checked = next;
        });
        setAll(next);
      }}
    >
      {all ? "Clear all" : "Select all"}
    </button>
  );
}

export function FindingRow({ place, checked = false }: { place: MapPlace; checked?: boolean }) {
  const [row, setRow] = useState(place);

  function edit(key: "business_name" | "address" | "city" | "phones" | "emails" | "website", value: string) {
    setRow((current) => ({ ...current, [key]: value }));
  }

  return (
    <tr className="border-b border-ink/5 align-top">
      <td className="px-3 py-2">
        <input type="checkbox" name="pick" value={row.id} defaultChecked={checked} />
        <input type="hidden" name="place" value={JSON.stringify(row)} />
      </td>
      <td className="px-2 py-2">
        <input className={field} aria-label="Name" value={row.business_name} onChange={(event) => edit("business_name", event.target.value)} />
      </td>
      <td className="px-2 py-2">
        <input className={field} aria-label="Address" value={row.address} onChange={(event) => edit("address", event.target.value)} />
      </td>
      <td className="px-2 py-2">
        <input className={field} aria-label="City" value={row.city} onChange={(event) => edit("city", event.target.value)} />
      </td>
      <td className="px-2 py-2">
        <input className={field} aria-label="Phone" value={row.phones} onChange={(event) => edit("phones", event.target.value)} />
      </td>
      <td className="px-2 py-2">
        <input className={field} aria-label="Email" value={row.emails} onChange={(event) => edit("emails", event.target.value)} />
      </td>
      <td className="px-2 py-2">
        <input className={field} aria-label="Website" value={row.website} onChange={(event) => edit("website", event.target.value)} />
      </td>
      <td className="px-3 py-2">
        <ContactLinks phones={row.phones} emails={row.emails} name={row.business_name} />
      </td>
    </tr>
  );
}
