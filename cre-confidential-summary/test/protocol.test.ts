import assert from "node:assert/strict";
import test from "node:test";

import {
  ANTHROPIC_MODEL,
  buildAnthropicRequest,
  generateSummary,
  MAX_INPUT_CHARS,
  MAX_OUTPUT_TOKENS,
  SummaryError,
  SYSTEM_PROMPT,
  validateInput,
} from "../src/protocol.js";

test("retains the existing Anthropic model, prompt contract, and output cap", () => {
  const request = buildAnthropicRequest(validateInput({ text: "x" }));
  assert.equal(request.model, ANTHROPIC_MODEL);
  assert.equal(request.max_tokens, MAX_OUTPUT_TOKENS);
  assert.equal(request.system, SYSTEM_PROMPT);
  assert.match(request.system, /without a title, heading, label, or Markdown formatting/);
  assert.deepEqual(request.messages, [{ role: "user", content: "x" }]);
});

test("rejects missing, blank, and oversized inputs without echoing them", () => {
  for (const input of [{}, { text: "   " }, { text: "x".repeat(MAX_INPUT_CHARS + 1) }]) {
    assert.throws(() => validateInput(input), (error: unknown) => {
      return error instanceof SummaryError && error.code === "INVALID_INPUT";
    });
  }
});

test("returns the provider text and clamps malformed overlong output", () => {
  const output = Array.from({ length: MAX_OUTPUT_TOKENS + 5 }, () => "word").join(" ");
  const summary = generateSummary({ text: "x" }, () => ({
    statusCode: 200,
    body: { content: [{ type: "text", text: output }] },
  }));
  assert.equal(summary.split(/\s+/u).length, MAX_OUTPUT_TOKENS);
});

test("maps provider failures and malformed provider bodies to safe errors", () => {
  assert.throws(
    () => generateSummary({ text: "x" }, () => ({ statusCode: 401, body: {} })),
    (error: unknown) => error instanceof SummaryError && error.code === "PROVIDER_FAILURE",
  );
  assert.throws(
    () => generateSummary({ text: "x" }, () => ({ statusCode: 200, body: {} })),
    (error: unknown) =>
      error instanceof SummaryError && error.code === "INVALID_PROVIDER_RESPONSE",
  );
});
