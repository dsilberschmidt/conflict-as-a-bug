import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT =
  "Summarize and anonymize the following conflict in one paragraph. " +
  "Do not identify the parties by name or role — describe the situation " +
  "and each side's perspective in neutral terms.";

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
  return block.text;
}
