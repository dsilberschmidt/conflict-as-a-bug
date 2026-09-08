# Conflict as a Bug

Conflict as a Bug helps people treat conflict as a shared problem: describe it, understand each other, and—only with both parties’ consent—open it to people who may help. **Live demo: https://conflict-as-a-bug.vercel.app/**

## Current flow

Direct conversation is preferred. The app is an alternative when it is unfeasible, inappropriate, interrupted, or insufficient: A and B exchange private encrypted perspectives and paraphrases until they reach confirmed mutual understanding. Understanding is not agreement or resolution.

Then each person signs consent with an email-authenticated Privy embedded wallet. This is intentionally two explicit actions: the first click opens email login and asks the person to select the button again; the second opens the signature. The first signer fixes one encrypted `openEnvelope`, stores their consent and shares a fresh transport link; the second signs that exact envelope and opens the case. The summary is generated separately and the public showcase accepts solver contributions.

## Architecture and privacy boundary

- Next.js, TypeScript and Web Crypto: the private invitation travels as AES-256-GCM ciphertext. Its decryption key is in the URL fragment, so the complete link is a bearer secret: share it only through the intended channel.
- Privy: email authentication and EIP-191 signatures through an embedded Ethereum wallet.
- Upstash Redis stores opened-case records and contributions; Anthropic receives separately supplied plain-text perspectives/paraphrases to generate the summary.
- Sepolia `CaseRegistry`: [`0x0a481Eeb5971ab086e3B7A2c22fe9C37f91fEd6c`](https://sepolia.etherscan.io/address/0x0a481Eeb5971ab086e3B7A2c22fe9C37f91fEd6c).

The private phase is not persisted server-side. On opening, the encrypted `openEnvelope` is fixed and signed. Chain data is limited to hashes, signatures, addresses and status—never case text. See [docs/context.md](docs/context.md) for exact hashing and current limits.

## Run locally

Node 24 is specified in `.nvmrc`:

```sh
nvm install
nvm use
cd web
npm install
npm run dev
```

The complete flow needs `NEXT_PUBLIC_PRIVY_APP_ID`; Upstash accepts `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, `KV_REST_API_URL` / `KV_REST_API_TOKEN`, or Vercel Marketplace’s `UPSTASH_REDIS_KV_REST_API_URL` / `UPSTASH_REDIS_KV_REST_API_TOKEN`. Summary and relay require `ANTHROPIC_API_KEY`, `CASE_REGISTRY_RPC_URL`, `CASE_REGISTRY_BACKEND_PRIVATE_KEY`, and `CASE_REGISTRY_CONTRACT_ADDRESS`.

After review, Daniel verifies from `web/` with `npm run lint` and `npm run build` in separate commands. Operational setup and the project record are in [docs/instalaciones.md](docs/instalaciones.md), [docs/context.md](docs/context.md), [docs/bitacora.md](docs/bitacora.md), [docs/roadmap.md](docs/roadmap.md), and [docs/future.md](docs/future.md).
