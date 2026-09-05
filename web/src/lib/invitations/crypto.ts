/** Browser-native encryption for invitation payloads. */

export const INVITATION_ENCRYPTION_VERSION = "v1" as const;
export const INVITATION_SCHEMA_VERSION = "v1" as const;
const INVITATION_ENCRYPTION_ALGORITHM = "AES-256-GCM" as const;
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;
const CASE_ID_LENGTH_BYTES = 16;
const INITIAL_REVISION = 1;

export interface Invitation {
  schemaVersion: typeof INVITATION_SCHEMA_VERSION;
  caseId: string;
  revision: number;
  perspectives: {
    inviter: string;
    invitee?: string;
  };
}

export interface EncryptedInvitationEnvelope {
  version: typeof INVITATION_ENCRYPTION_VERSION;
  algorithm: typeof INVITATION_ENCRYPTION_ALGORITHM;
  iv: string;
  ciphertext: string;
}

export interface EncryptedInvitation {
  envelope: EncryptedInvitationEnvelope;
  decryptionKey: string;
}

function getWebCrypto(): Crypto {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new Error("Web Crypto API is unavailable");
  }

  return globalThis.crypto;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: unknown): Uint8Array {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) {
    throw new Error("Invalid base64url value");
  }

  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (base64.length % 4)) % 4;
  const binary = atob(base64.padEnd(base64.length + paddingLength, "="));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

/** Copies bytes into an ArrayBuffer, a Web Crypto-compatible BufferSource. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function hasExpectedFields(value: Record<string, unknown>, expectedFields: string[]): boolean {
  const fields = Reflect.ownKeys(value);

  return (
    fields.length === expectedFields.length &&
    fields.every((field) => typeof field === "string" && expectedFields.includes(field))
  );
}

function isCaseId(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    return decodeBase64Url(value).byteLength === CASE_ID_LENGTH_BYTES;
  } catch {
    return false;
  }
}

function isInvitation(value: unknown): value is Invitation {
  if (!isRecord(value) || !hasExpectedFields(value, ["schemaVersion", "caseId", "revision", "perspectives"])) {
    return false;
  }

  if (
    value.schemaVersion !== INVITATION_SCHEMA_VERSION ||
    !isCaseId(value.caseId) ||
    typeof value.revision !== "number" ||
    !Number.isInteger(value.revision) ||
    value.revision < INITIAL_REVISION ||
    !isRecord(value.perspectives) ||
    !hasExpectedFields(
      value.perspectives,
      Object.hasOwn(value.perspectives, "invitee") ? ["inviter", "invitee"] : ["inviter"],
    ) ||
    typeof value.perspectives.inviter !== "string" ||
    (Object.hasOwn(value.perspectives, "invitee") && typeof value.perspectives.invitee !== "string")
  ) {
    return false;
  }

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Creates the first encrypted-state payload for an invitation. */
export function createInitialInvitation(perspective: string): Invitation {
  if (typeof perspective !== "string") {
    throw new TypeError("Inviter perspective must be a string");
  }

  const caseId = encodeBase64Url(
    getWebCrypto().getRandomValues(new Uint8Array(CASE_ID_LENGTH_BYTES)),
  );

  return {
    schemaVersion: INVITATION_SCHEMA_VERSION,
    caseId,
    revision: INITIAL_REVISION,
    perspectives: { inviter: perspective },
  };
}

/** Adds B's perspective while preserving the case and advancing its revision. */
export function addInviteePerspective(
  invitation: Invitation,
  perspective: string,
): Invitation {
  if (!isInvitation(invitation) || typeof perspective !== "string") {
    throw new TypeError("Invalid invitation state");
  }

  if (invitation.revision === Number.MAX_SAFE_INTEGER) {
    throw new Error("Invitation revision cannot be incremented");
  }

  return {
    ...invitation,
    revision: invitation.revision + 1,
    perspectives: {
      ...invitation.perspectives,
      invitee: perspective,
    },
  };
}

function assertEnvelope(envelope: unknown): asserts envelope is EncryptedInvitationEnvelope {
  if (!isRecord(envelope)) {
    throw new Error("Invalid invitation encryption envelope");
  }

  const expectedFields = ["version", "algorithm", "iv", "ciphertext"];
  const fields = Reflect.ownKeys(envelope);

  if (
    fields.length !== expectedFields.length ||
    fields.some((field) => typeof field !== "string" || !expectedFields.includes(field))
  ) {
    throw new Error("Invalid invitation encryption envelope");
  }

  if (
    typeof envelope.version !== "string" ||
    typeof envelope.algorithm !== "string" ||
    typeof envelope.iv !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Invalid invitation encryption envelope");
  }

  if (envelope.version !== INVITATION_ENCRYPTION_VERSION) {
    throw new Error("Unsupported invitation encryption version");
  }

  if (envelope.algorithm !== INVITATION_ENCRYPTION_ALGORITHM) {
    throw new Error("Unsupported invitation encryption algorithm");
  }
}

/** Encrypts an invitation using a fresh AES-256-GCM key and 96-bit IV. */
export async function encryptInvitation(
  invitation: Invitation,
): Promise<EncryptedInvitation> {
  if (!isInvitation(invitation)) {
    throw new TypeError("Invalid invitation state");
  }

  const webCrypto = getWebCrypto();
  const keyBytes = webCrypto.getRandomValues(new Uint8Array(KEY_LENGTH_BYTES));
  const iv = webCrypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const key = await webCrypto.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const plaintext = toArrayBuffer(new TextEncoder().encode(JSON.stringify(invitation)));
  const ciphertext = await webCrypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    plaintext,
  );

  return {
    envelope: {
      version: INVITATION_ENCRYPTION_VERSION,
      algorithm: INVITATION_ENCRYPTION_ALGORITHM,
      iv: encodeBase64Url(iv),
      ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
    },
    decryptionKey: encodeBase64Url(keyBytes),
  };
}

/**
 * Decrypts a version 1 invitation envelope.
 *
 * Store only the envelope. Keep the decryption key in a separate channel.
 */
export async function decryptInvitation(
  envelope: unknown,
  decryptionKey: unknown,
): Promise<Invitation> {
  assertEnvelope(envelope);

  const keyBytes = toArrayBuffer(decodeBase64Url(decryptionKey));
  const iv = toArrayBuffer(decodeBase64Url(envelope.iv));
  const ciphertext = toArrayBuffer(decodeBase64Url(envelope.ciphertext));

  if (keyBytes.byteLength !== KEY_LENGTH_BYTES || iv.byteLength !== IV_LENGTH_BYTES) {
    throw new Error("Invalid invitation encryption material");
  }

  if (ciphertext.byteLength <= 16) {
    throw new Error("Invalid invitation ciphertext");
  }

  let invitation: unknown;

  try {
    const webCrypto = getWebCrypto();
    const key = await webCrypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
    const plaintext = await webCrypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    invitation = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext));
  } catch {
    throw new Error("Unable to decrypt invitation");
  }

  if (!isInvitation(invitation)) {
    throw new Error("Invalid decrypted invitation");
  }

  return invitation;
}
