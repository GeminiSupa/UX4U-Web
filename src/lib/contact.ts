export function firstValue(value: string) {
  return value.split(/[;,]/).map((item) => item.trim()).find(Boolean) || "";
}

export function telHref(phones: string) {
  const phone = firstValue(phones);
  const dial = phone.replace(/[^\d+]/g, "");
  return dial ? `tel:${dial}` : "";
}

export function mailHref(emails: string, name: string) {
  const address = firstValue(emails);
  if (!address.includes("@")) return "";
  const subject = `Hello from UX4U — ${name || "your business"}`;
  const body = [
    "Hello,",
    "",
    `This is UX4U (info@ux4u.online), writing about ${name || "your business"}.`,
    "",
    "If this is not useful, reply with stop and we will not write again."
  ].join("\n");
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
