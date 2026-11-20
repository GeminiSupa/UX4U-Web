import "server-only";
import { admin } from "./supabase";

export type Summary = {
  views: number;
  visitors: number;
  sessions: number;
  leads: number;
  daily: { day: string; sessions: number; views: number }[];
  pages: { path: string; views: number; visitors: number }[];
  sources: { source: string; sessions: number }[];
  names: { source: string; name: string; sessions: number }[];
  devices: { device: string; sessions: number }[];
  countries: { country: string; sessions: number }[];
  landing: { path: string; sessions: number }[];
  lead_sources: { source: string; leads: number }[];
};

const EMPTY: Summary = {
  views: 0,
  visitors: 0,
  sessions: 0,
  leads: 0,
  daily: [],
  pages: [],
  sources: [],
  names: [],
  devices: [],
  countries: [],
  landing: [],
  lead_sources: []
};

export async function trafficSummary(from: Date, to: Date): Promise<{ ready: boolean; data: Summary }> {
  try {
    const { data, error } = await admin().rpc("traffic_summary", { p_from: from.toISOString(), p_to: to.toISOString() });
    if (error || !data) return { ready: false, data: EMPTY };
    return { ready: true, data: { ...EMPTY, ...(data as Partial<Summary>) } };
  } catch {
    return { ready: false, data: EMPTY };
  }
}

export async function countSince(table: string, from: Date, to: Date, column = "created_at") {
  try {
    const { count } = await admin()
      .from(table)
      .select("id", { count: "exact", head: true })
      .gte(column, from.toISOString())
      .lt(column, to.toISOString());
    return count || 0;
  } catch {
    return 0;
  }
}
