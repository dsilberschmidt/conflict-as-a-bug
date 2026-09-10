use aes_gcm::{aead::{Aead, KeyInit, Payload}, Aes256Gcm, Nonce};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use cre_wasm_exports::extend_wasm_exports;
use javy_plugin_api::javy::quickjs::{Ctx, Object};
use javy_plugin_api::javy::quickjs::prelude::*;
use rsa::{Oaep, RsaPrivateKey};
use rsa::pkcs8::DecodePrivateKey;
use rsa::traits::PublicKeyParts;
use serde::Deserialize;
use sha2::Sha256;

const VERSION: u8 = 1;
const ALGORITHM: &str = "RSA-OAEP-256+A256GCM";
const MAX_PLAINTEXT_BYTES: usize = 96_000;
const MAX_CIPHERTEXT_BYTES: usize = MAX_PLAINTEXT_BYTES + 16;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Envelope {
    version: u8,
    algorithm: String,
    key_id: String,
    wrapped_key: String,
    iv: String,
    ciphertext: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DecryptRequest {
    private_key_pem: String,
    envelope: Envelope,
}

fn valid_key_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 64
        && value.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
}

fn decode_base64url(value: &str, min: usize, max: usize) -> Option<Vec<u8>> {
    if value.is_empty() || value.len() > ((max * 4 + 2) / 3) + 4 {
        return None;
    }
    let bytes = URL_SAFE_NO_PAD.decode(value).ok()?;
    (bytes.len() >= min && bytes.len() <= max).then_some(bytes)
}

fn decrypt(request_json: String) -> String {
    let request: DecryptRequest = match serde_json::from_str(&request_json) {
        Ok(value) => value,
        Err(_) => return String::new(),
    };
    let envelope = request.envelope;
    if envelope.version != VERSION || envelope.algorithm != ALGORITHM || !valid_key_id(&envelope.key_id) {
        return String::new();
    }

    let wrapped_key = match decode_base64url(&envelope.wrapped_key, 256, 256) {
        Some(value) => value,
        None => return String::new(),
    };
    let iv = match decode_base64url(&envelope.iv, 12, 12) {
        Some(value) => value,
        None => return String::new(),
    };
    let ciphertext = match decode_base64url(&envelope.ciphertext, 17, MAX_CIPHERTEXT_BYTES) {
        Some(value) => value,
        None => return String::new(),
    };

    let pem = request.private_key_pem.replace("\\n", "\n");
    let private_key = match RsaPrivateKey::from_pkcs8_pem(&pem) {
        Ok(value) if value.n().bits() == 2048 => value,
        _ => return String::new(),
    };
    let aes_key = match private_key.decrypt(Oaep::new::<Sha256>(), &wrapped_key) {
        Ok(value) if value.len() == 32 => value,
        _ => return String::new(),
    };
    let cipher = match Aes256Gcm::new_from_slice(&aes_key) {
        Ok(value) => value,
        Err(_) => return String::new(),
    };
    let aad = format!("{}|{}|{}", VERSION, ALGORITHM, envelope.key_id);
    let plaintext = match cipher.decrypt(
        Nonce::from_slice(&iv),
        Payload { msg: &ciphertext, aad: aad.as_bytes() },
    ) {
        Ok(value) if !value.is_empty() && value.len() <= MAX_PLAINTEXT_BYTES => value,
        _ => return String::new(),
    };
    String::from_utf8(plaintext).unwrap_or_default()
}

pub fn register(ctx: &Ctx<'_>) {
    let object = Object::new(ctx.clone()).unwrap();
    object.set("decrypt", Func::from(decrypt)).unwrap();
    extend_wasm_exports(ctx, "teeHybridCrypto", object);
}
