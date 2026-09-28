import { getLeads } from "@/lib/data";

export const dynamic = "force-dynamic";

function cell(value: string) {
  const text = value || "";
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function GET() {
  const leads = await getLeads();
  const header = ["Restaurant", "City", "Owner", "Email", "Phone", "Website", "Current POS", "Contacted"];
  const lines = [
    header.join(","),
    ...leads.map((lead) =>
      [
        lead.business_name,
        lead.city,
        lead.contact_name,
        lead.emails,
        lead.phones,
        lead.website,
        lead.current_pos,
        lead.contacted ? "Yes" : "No"
      ]
        .map((value) => cell(String(value || "")))
        .join(",")
    )
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=ux4u-restaurant-outreach.csv"
    }
  });
}
