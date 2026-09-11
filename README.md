# Conflict as a Bug

Conflict as a Bug turns conflict into a shared problem that can be understood
before it is opened to people who may help. It was built from scratch during
ETHOnline 2026.
**[Try the live demo](https://conflict-as-a-bug.vercel.app/).**

## Demonstrated flow

Direct conversation is preferred. The app is an alternative when it is
unfeasible, inappropriate, interrupted, or insufficient.

1. A and B exchange private, encrypted perspectives and paraphrases until they
   confirm mutual understanding. Understanding is not agreement or resolution.
2. Each person logs in by email with Privy and signs consent using an embedded
   wallet. The backend relays both signatures to the Sepolia
   [`CaseRegistry`](https://sepolia.etherscan.io/address/0x0a481Eeb5971ab086e3B7A2c22fe9C37f91fEd6c),
   which opens and anchors the case.
3. The public showcase displays a neutral summary. In this PoC, an anonymous,
   unauthenticated solver can submit one visible contribution and may request
   backing.
4. Any visitor can run the simulated audit; it always approves and performs no
   real review. To provide backing, a backer logs in with Privy and uses an
   embedded wallet. The faucet supplies testnet ETH to that wallet, which then
   sends a real on-chain transfer of `0.001` Sepolia ETH to the case recipient.

The private invitation state is AES-256-GCM ciphertext, with its decryption key
in the URL fragment. The whole link is therefore a bearer secret. Case text is
not stored on-chain: `CaseRegistry` receives hashes, signatures, addresses and
status only. The private phase between A and B is not persisted server-side;
Upstash Redis stores opened-case records and contributions.

## Summaries: current web app vs. CRE prototype

The deployed web app currently generates the public summary directly through
Anthropic Haiku (`claude-haiku-4-5-20251001`).

[`cre-confidential-summary/`](cre-confidential-summary/README.md) is a separate
Chainlink CRE Confidential Workflow prototype. It accepts an
RSA-OAEP/SHA-256 + AES-256-GCM envelope, decrypts it inside `handlerInTee` with
a Rust plugin, calls Haiku, and returns only the summary. It has passed CRE CLI
simulation with synthetic data, but is not connected to the web flow or
deployed to a DON; no real TEE, Vault, or attestation has been tested.

## Run locally

Node `24` is specified in [`.nvmrc`](.nvmrc).

```sh
nvm install
nvm use
cd web
npm install
npm run dev
```

The full web flow requires:

- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- Upstash Redis credentials: `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN` (the `KV_REST_*` and
  `UPSTASH_REDIS_KV_REST_*` aliases are also supported)
- `ANTHROPIC_API_KEY`
- `CASE_REGISTRY_RPC_URL`, `CASE_REGISTRY_BACKEND_PRIVATE_KEY`, and
  `CASE_REGISTRY_CONTRACT_ADDRESS`

Available web commands include `npm run dev`, `npm run lint`, `npm run build`,
`npm run test:crypto`, `npm run test:cases`, `npm run test:chain-sync`,
`npm run test:privy-server`, `npm run test:faucet`, and
`npm run generate:confirmed-invite -- <base-url>`.

For setup, architecture, project history, and known limits, see
[installation notes](docs/instalaciones.md), [technical context](docs/context.md),
[project log](docs/bitacora.md), [roadmap](docs/roadmap.md), and
[future work](docs/future.md).
