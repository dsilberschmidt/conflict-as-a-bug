import { cre, json, ok, type TeeRuntime } from "@chainlink/cre-sdk";
import { Runner } from "@chainlink/cre-sdk";

import {
  buildAnthropicRequest,
  parseAnthropicResponse,
  SummaryError,
  validateInput,
} from "./protocol.js";
import { EnvelopeError, privateKeySecretId, validateEnvelope } from "./envelope.js";
import { decryptInTee } from "./tee-hybrid-crypto.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_SECRET_ID = "anthropic_api_key";

type Config = unknown;

function decryptTriggerInput(runtime: TeeRuntime<Config>, input: Uint8Array): unknown {
  try {
    const envelope = validateEnvelope(JSON.parse(new TextDecoder().decode(input)));
    const privateKeyPem = runtime.getSecret({ id: privateKeySecretId(envelope.keyId) }).result().value;
    const plaintext = decryptInTee(privateKeyPem, envelope);
    if (!plaintext) throw new EnvelopeError();
    return { text: plaintext };
  } catch {
    // No envelope, key, OAEP, or GCM failure detail crosses the TEE boundary.
    throw new SummaryError("INVALID_INPUT");
  }
}

function callAnthropic(runtime: TeeRuntime<Config>, input: unknown): string {
  const summaryInput = validateInput(input);
  const apiKey = runtime.getSecret({ id: ANTHROPIC_SECRET_ID }).result().value;
  if (!apiKey) {
    throw new SummaryError("PROVIDER_FAILURE");
  }

  const response = new cre.capabilities.HTTPClient()
    .sendRequest(runtime, {
      url: ANTHROPIC_URL,
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: new TextEncoder().encode(JSON.stringify(buildAnthropicRequest(summaryInput))),
    })
    .result();

  if (!ok(response)) {
    // Do not expose provider response bodies: they can contain request-correlated data.
    throw new SummaryError("PROVIDER_FAILURE");
  }
  return parseAnthropicResponse(json(response));
}

const http = new cre.capabilities.HTTPCapability();

export const workflow = [
  cre.handlerInTee(
    http.trigger({}),
    (runtime, payload) => callAnthropic(runtime, decryptTriggerInput(runtime, payload.input)),
    { regions: ["us-west-2"] },
  ),
];

export async function main() {
  const runner = await Runner.newRunner<Config>({
    configParser: () => ({}),
  });
  await runner.run(() => workflow);
}

await main();
