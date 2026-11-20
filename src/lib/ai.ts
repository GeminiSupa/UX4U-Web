import "server-only";

/**
 * Minimal OpenAI Responses API client (no SDK). Server only: the key never reaches the browser.
 * OPENAI_MODEL overrides the default model.
 */

const ENDPOINT = "https://api.openai.com/v1/responses";
export const DEFAULT_MODEL = "gpt-5-mini";

export type Citation = { url: string; title: string };
export type AiResult = { text: string; citations: Citation[] };

type JsonSchema = Record<string, unknown>;

export function aiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export class AiError extends Error {}

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
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new AiError("Add OPENAI_API_KEY to the server environment to use AI features.");

  const body: Record<string, unknown> = {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    instructions,
    input,
    max_output_tokens: maxOutputTokens
  };
  if (webSearch) body.tools = [{ type: "web_search" }];
  if (schema) body.text = { format: { type: "json_schema", name: schemaName, schema, strict: true } };

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store"
    });
  } catch {
    throw new AiError("The AI service did not answer in time. Try again.");
  }
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = (json.error as { message?: string } | undefined)?.message || `HTTP ${response.status}`;
    throw new AiError(`AI request failed: ${message}`);
  }
  return readOutput(json);
}

/** Pulls text and URL citations out of a raw Responses API payload. */
export function readOutput(json: Record<string, unknown>): AiResult {
  const parts: string[] = [];
  const citations: Citation[] = [];
  const output = Array.isArray(json.output) ? (json.output as Record<string, unknown>[]) : [];
  for (const item of output) {
    if (item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content as Record<string, unknown>[]) {
      if (content.type !== "output_text") continue;
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
