import "server-only";

/**
 * Minimal Gemini Interactions API client (no SDK). Server only: the key never reaches the browser.
 * GEMINI_MODEL overrides the default model.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const SEARCH_MODEL = "gemini-3.8-flash";

export type Citation = { url: string; title: string };
export type AiResult = { text: string; citations: Citation[] };

type JsonSchema = Record<string, unknown>;

export function aiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export class AiError extends Error {}

function modelCandidates(webSearch: boolean) {
  const configured = process.env.GEMINI_MODEL?.trim();
  const defaults = webSearch ? [SEARCH_MODEL, DEFAULT_MODEL] : [DEFAULT_MODEL, SEARCH_MODEL];
  return Array.from(new Set([configured, ...defaults].filter((model): model is string => Boolean(model))));
}

function errorMessage(json: Record<string, unknown>, status: number) {
  const error = json.error as { message?: string } | undefined;
  return error?.message || `HTTP ${status}`;
}

function finalError(status: number, message: string) {
  if (status === 401 || status === 403) return new AiError(`Gemini rejected the API key: ${message}`);
  if (status === 429) return new AiError("Gemini quota is exhausted. Check the API key's rate limits or billing, then try again.");
  if (status >= 500) return new AiError("Gemini is temporarily busy. Try again in a minute.");
  return new AiError(`Gemini request failed: ${message}`);
}

export async function askAi({
  instructions,
  input,
  schema,
  schemaName = "result",
  webSearch = false,
  maxOutputTokens = 4000,
  timeoutMs = 90000
}: {
  instructions: string;
  input: string;
  schema?: JsonSchema;
  schemaName?: string;
  webSearch?: boolean;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<AiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("Add GEMINI_API_KEY to the server environment to use AI features.");

  const body: Record<string, unknown> = {
    system_instruction: instructions,
    input,
    store: false,
    generation_config: { max_output_tokens: maxOutputTokens }
  };
  if (webSearch) body.tools = [{ type: "google_search" }];
  if (schema) body.response_format = { type: "text", mime_type: "application/json", schema };

  // Kept in the public options for compatibility with existing callers. Gemini schemas are unnamed.
  void schemaName;

  let lastStatus = 503;
  let lastMessage = "The service did not answer in time.";
  const attemptTimeout = Math.min(timeoutMs, 45000);

  for (const model of modelCandidates(webSearch)) {
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "x-goog-api-key": key,
          "Content-Type": "application/json",
          "Api-Revision": "2026-05-20"
        },
        body: JSON.stringify({ ...body, model }),
        signal: AbortSignal.timeout(attemptTimeout),
        cache: "no-store"
      });
    } catch {
      lastStatus = 503;
      lastMessage = "The service did not answer in time.";
      continue;
    }

    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (response.ok) return readOutput(json);

    lastStatus = response.status;
    lastMessage = errorMessage(json, response.status);
    if (response.status === 401 || response.status === 403) break;
  }

  throw finalError(lastStatus, lastMessage);
}

/** Pulls text and URL citations out of a raw Gemini Interactions API payload. */
export function readOutput(json: Record<string, unknown>): AiResult {
  const parts: string[] = [];
  const citations: Citation[] = [];
  const steps = Array.isArray(json.steps) ? (json.steps as Record<string, unknown>[]) : [];
  for (const item of steps) {
    if (item.type !== "model_output" || !Array.isArray(item.content)) continue;
    for (const content of item.content as Record<string, unknown>[]) {
      if (content.type !== "text") continue;
      parts.push(String(content.text || ""));
      const notes = Array.isArray(content.annotations) ? (content.annotations as Record<string, unknown>[]) : [];
      for (const note of notes) {
        if (note.type === "url_citation" && typeof note.url === "string") {
          citations.push({ url: note.url, title: String(note.title || note.url) });
        }
      }
    }
  }
  const unique = new Map(citations.map((citation) => [citation.url, citation]));
  return { text: parts.join("").trim(), citations: Array.from(unique.values()) };
}

export async function askAiJson<T>(options: Parameters<typeof askAi>[0] & { schema: JsonSchema }): Promise<T> {
  const result = await askAi(options);
  try {
    return JSON.parse(result.text) as T;
  } catch {
    throw new AiError("The AI answer was not in the expected format. Try again.");
  }
}
