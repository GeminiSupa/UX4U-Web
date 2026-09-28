import { getLeads } from "@/lib/data";

export const dynamic = "force-dynamic";

function cell(value: string) {
  const text = value || "";
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function GET() {
  const leads = await getLeads();
  const columns = [
    "business_name",
    "website",
    "emails",
    "phones",
    "whatsapp",
    "contact_name",
    "city",
    "category",
    "source_url",
    "notes",
    "created_at"
  ] as const;
  const lines = [
    columns.join(","),
    ...leads.map((lead) =>
      columns.map((column) => cell(String((lead as Record<string, string>)[column] || ""))).join(",")
    )
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=ux4u-leads.csv"
    }
  });
}
