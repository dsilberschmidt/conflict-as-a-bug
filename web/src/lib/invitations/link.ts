import type { EncryptedInvitation, EncryptedInvitationEnvelope } from "./crypto";

const INVITATION_PATH = "/invite";
const QUERY_FIELDS = ["v", "a", "iv", "c"];

function invalidLink(): never {
  throw new Error("Invalid invitation link");
}

function assertExactParameters(parameters: URLSearchParams, expectedFields: string[]): void {
  const fields = Array.from(parameters.keys());

  if (
    fields.length !== expectedFields.length ||
    fields.some((field) => !expectedFields.includes(field)) ||
    expectedFields.some((field) => parameters.getAll(field).length !== 1)
  ) {
    invalidLink();
  }
}

function isSupportedVersion(
  version: string,
): version is EncryptedInvitationEnvelope["version"] {
  return version === "v1";
}

function isSupportedAlgorithm(
  algorithm: string,
): algorithm is EncryptedInvitationEnvelope["algorithm"] {
  return algorithm === "AES-256-GCM";
}

/**
 * Creates a portable invitation link.
 *
 * The encrypted envelope is placed in the query string. The decryption key is
 * placed only in the URL fragment, which callers must keep separate from
 * stored or server-visible data.
 */
export function createInvitationLink(
  baseUrl: string | URL,
  invitation: EncryptedInvitation,
): string {
  const url = new URL(baseUrl.toString());
  const { envelope, decryptionKey } = invitation;

  url.pathname = INVITATION_PATH;
  url.search = new URLSearchParams({
    v: envelope.version,
    a: envelope.algorithm,
    iv: envelope.iv,
    c: envelope.ciphertext,
  }).toString();
  url.hash = new URLSearchParams({ k: decryptionKey }).toString();

  return url.toString();
}

/**
 * Parses a portable invitation link into inputs for decryptInvitation.
 * Cryptographic validation remains the responsibility of decryptInvitation.
 */
export function parseInvitationLink(link: string | URL): EncryptedInvitation {
  let url: URL;

  try {
    url = new URL(link.toString());
  } catch {
    invalidLink();
  }

  if (url.pathname !== INVITATION_PATH) {
    invalidLink();
  }

  assertExactParameters(url.searchParams, QUERY_FIELDS);

  const fragment = new URLSearchParams(url.hash.slice(1));
  assertExactParameters(fragment, ["k"]);

  const version = url.searchParams.get("v");
  const algorithm = url.searchParams.get("a");

  if (
    version === null ||
    algorithm === null ||
    !isSupportedVersion(version) ||
    !isSupportedAlgorithm(algorithm)
  ) {
    invalidLink();
  }

  const envelope: EncryptedInvitationEnvelope = {
    version,
    algorithm,
    iv: url.searchParams.get("iv")!,
    ciphertext: url.searchParams.get("c")!,
  };

  return {
    envelope,
    decryptionKey: fragment.get("k")!,
  };
}
