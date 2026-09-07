import assert from "node:assert/strict";
import test from "node:test";

import { createCaseStore } from "./store.ts";

const SAMPLE_ENVELOPE = {
  version: "v1",
  algorithm: "AES-256-GCM",
  iv: "iv",
  ciphertext: "ciphertext",
};

/** In-memory fake of the KvClient subset store.ts depends on. */
function createFakeKvClient() {
  const values = new Map();
  const sets = new Map();
  const lists = new Map();

  return {
    async get(key) {
      return values.has(key) ? values.get(key) : null;
    },
    async set(key, value) {
      values.set(key, value);
    },
    async sadd(key, member) {
      if (!sets.has(key)) sets.set(key, new Set());
      sets.get(key).add(member);
    },
    async srem(key, member) {
      sets.get(key)?.delete(member);
    },
    async smembers(key) {
      return Array.from(sets.get(key) ?? []);
    },
    async rpush(key, value) {
      if (!lists.has(key)) lists.set(key, []);
      lists.get(key).push(value);
    },
    async lrange(key, start, stop) {
      const list = lists.get(key) ?? [];
      return stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
    },
  };
}

test("creates a case as opened and rejects a duplicate caseId", async () => {
  const store = createCaseStore(createFakeKvClient());

  const record = await store.createCase("case-1", SAMPLE_ENVELOPE);
  assert.equal(record.status, "opened");
  assert.equal(record.caseId, "case-1");
  assert.equal(record.summary, undefined);

  await assert.rejects(() => store.createCase("case-1", SAMPLE_ENVELOPE), /already exists/);
});

test("lists a created case under its status", async () => {
  const store = createCaseStore(createFakeKvClient());

  await store.createCase("case-1", SAMPLE_ENVELOPE);
  assert.deepEqual(await store.listCasesByStatus("opened"), ["case-1"]);
  assert.deepEqual(await store.listCasesByStatus("closed"), []);
});

test("setStatus moves a case between the by-status listings", async () => {
  const store = createCaseStore(createFakeKvClient());

  await store.createCase("case-1", SAMPLE_ENVELOPE);
  await store.setStatus("case-1", "closed");

  assert.deepEqual(await store.listCasesByStatus("opened"), []);
  assert.deepEqual(await store.listCasesByStatus("closed"), ["case-1"]);

  const record = await store.getCase("case-1");
  assert.equal(record.status, "closed");
});

test("setSummary attaches a public summary to an existing case", async () => {
  const store = createCaseStore(createFakeKvClient());

  await store.createCase("case-1", SAMPLE_ENVELOPE);
  const updated = await store.setSummary("case-1", "Anonymized summary text.");

  assert.equal(updated.summary, "Anonymized summary text.");
});

test("setSummary rejects a case that doesn't exist", async () => {
  const store = createCaseStore(createFakeKvClient());

  await assert.rejects(() => store.setSummary("missing", "x"), /not found/);
});

test("addContribution stores free text and listContributions returns it in order", async () => {
  const store = createCaseStore(createFakeKvClient());

  await store.createCase("case-1", SAMPLE_ENVELOPE);
  await store.addContribution("case-1", "First idea.");
  await store.addContribution("case-1", "Second idea.");

  const contributions = await store.listContributions("case-1");
  assert.equal(contributions.length, 2);
  assert.equal(contributions[0].text, "First idea.");
  assert.equal(contributions[1].text, "Second idea.");
  assert.notEqual(contributions[0].id, contributions[1].id);
});

test("addContribution rejects a case that is not open", async () => {
  const store = createCaseStore(createFakeKvClient());

  await store.createCase("case-1", SAMPLE_ENVELOPE);
  await store.setStatus("case-1", "closed");

  await assert.rejects(() => store.addContribution("case-1", "Too late."), /not open/);
});
