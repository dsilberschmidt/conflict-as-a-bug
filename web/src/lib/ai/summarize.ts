import Anthropic from "@anthropic-ai/sdk";

export const SYSTEM_PROMPT =
  "Summarize and anonymize the following conflict in one paragraph. " +
  "Do not identify the parties by name or role — describe the situation " +
  "and each side's perspective in neutral terms. Return only that paragraph: " +
  "no title, heading, label, Markdown, list, or prefatory text.";

/**
 * Removes only an unambiguous Markdown heading followed by a blank line. This
 * deliberately leaves inline Markdown, headings without body text, and any
 * other leading content untouched so the model's content is not discarded.
 */
export function removeInitialMarkdownHeading(summary: string): string {
  const match = /^(?: {0,3}#{1,6}[ \t]+[^\r\n]+)\r?\n[ \t]*\r?\n([\s\S]+)$/.exec(summary);
  return match ? match[1] : summary;
}

export async function generateSummary(plaintext: string): Promise<string> {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: plaintext }],
  });
  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }
  return removeInitialMarkdownHeading(block.text);
}
