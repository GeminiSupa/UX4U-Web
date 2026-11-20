import { can } from "@/lib/access";
import { aiConfigured } from "@/lib/ai";
import { listUsers } from "@/lib/auth";
import { runTaskReminders, runWeeklyUpdateReminders } from "@/lib/reminders";
import { notify } from "@/lib/team";
import { generateTrendReport, listTrendReports, weekOf } from "@/lib/trends";

// Called once a day by Vercel Cron (see vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result: Record<string, unknown> = {};

  try {
    result.reminders = await runTaskReminders();
  } catch (error) {
    result.reminders = { error: error instanceof Error ? error.message : "failed" };
  }

  try {
    result.weekly = await runWeeklyUpdateReminders();
  } catch (error) {
    result.weekly = { error: error instanceof Error ? error.message : "failed" };
  }

  // Weekly trend report: the first daily run on or after Monday that finds no report for this week.
  try {
    const { ready, reports } = await listTrendReports(1);
    const due = ready && aiConfigured() && reports[0]?.week_of !== weekOf();
    if (due) {
      const id = await generateTrendReport("Scheduled run");
      const people = (await listUsers()).filter((user) => user.active && can(user, "trends", "view"));
      for (const person of people) {
        await notify(person.id, { kind: "trends", body: "This week's AI and web trend report is ready.", link: `/dashboard/trends?report=${id}` });
      }
      result.trends = { created: id };
    } else {
      result.trends = { skipped: true };
    }
  } catch (error) {
    result.trends = { error: error instanceof Error ? error.message : "failed" };
  }

  return Response.json(result);
}
