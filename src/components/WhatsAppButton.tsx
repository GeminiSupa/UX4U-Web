import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { WHATSAPP, WHATSAPP_DISPLAY } from "@/lib/site";

export function whatsappHref() {
  const digits = WHATSAPP.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export function WhatsAppLink({ className = "" }: { className?: string }) {
  const href = whatsappHref();
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <WhatsAppIcon className="h-4 w-4 shrink-0 text-[#25D366]" />
      <span>{WHATSAPP_DISPLAY || WHATSAPP}</span>
    </a>
  );
}

export function WhatsAppFab() {
  const href = whatsappHref();
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_28px_-8px_rgba(37,211,102,0.8)] transition hover:scale-105 sm:bottom-6 sm:right-6"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
