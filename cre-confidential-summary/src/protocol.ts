export const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
export const MAX_OUTPUT_TOKENS = 300;
export const MAX_INPUT_CHARS = 24_000;

export const SYSTEM_PROMPT =
  "Summarize and anonymize the following conflict in one paragraph. " +
  "Do not identify the parties by name or role — describe the situation " +
  "and each side's perspective in neutral terms. " +
  "Return only that paragraph, without a title, heading, label, or Markdown formatting.";

export type SummaryInput = { text: string };

export type AnthropicRequest = {
  model: typeof ANTHROPIC_MODEL;
  max_tokens: typeof MAX_OUTPUT_TOKENS;
  system: typeof SYSTEM_PROMPT;
  messages: Array<{ role: "user"; content: string }>;
};

export class SummaryError extends Error {
  constructor(
    readonly code:
      | "INVALID_INPUT"
      | "PROVIDER_FAILURE"
      | "INVALID_PROVIDER_RESPONSE",
  ) {
    super(code);
  }
}

export function validateInput(input: unknown): SummaryInput {
  const text = (input as { text?: unknown } | null)?.text;
  if (typeof text !== "string" || !text.trim() || text.length > MAX_INPUT_CHARS) {
    throw new SummaryError("INVALID_INPUT");
  }
  return { text };
}

export function buildAnthropicRequest(input: SummaryInput): AnthropicRequest {
  return {
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: input.text }],
  };
}

export function parseAnthropicResponse(body: unknown): string {
  const content = (body as { content?: unknown } | null)?.content;
  if (!Array.isArray(content)) {
    throw new SummaryError("INVALID_PROVIDER_RESPONSE");
  }

  const first = content[0] as { type?: unknown; text?: unknown } | undefined;
  if (first?.type !== "text" || typeof first.text !== "string" || !first.text.trim()) {
    throw new SummaryError("INVALID_PROVIDER_RESPONSE");
  }

  // Anthropic receives max_tokens: 300. This is an additional fail-closed guard
  // against a malformed provider response. It never logs the generated text.
  return first.text.trim().split(/\s+/u).slice(0, MAX_OUTPUT_TOKENS).join(" ");
}

export type ProviderResponse = { statusCode: number; body: unknown };
export type AnthropicProvider = (request: AnthropicRequest) => ProviderResponse;

export function generateSummary(input: unknown, provider: AnthropicProvider): string {
  const request = buildAnthropicRequest(validateInput(input));
  const response = provider(request);
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new SummaryError("PROVIDER_FAILURE");
  }
  return parseAnthropicResponse(response.body);
}
