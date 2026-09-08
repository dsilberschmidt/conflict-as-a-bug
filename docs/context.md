# Contexto

## Propósito y principios

Conflict as a Bug explora el conflicto como un problema compartido: A y B pueden describirlo, comprenderse y trabajarlo juntas. El objetivo de v0.1 es alcanzar comprensión mutua confirmada; no exige acuerdo ni resolución.

## Conversación directa y ruta alternativa

La conversación directa es la vía preferida para A y B. Una práctica posible y recomendada consiste en que quien sostiene un corazón hable con cuidado, quien sostiene una caracola escuche con atención y silencio, y luego intercambien los objetos y los roles. Esta práctica es una recomendación, no un requisito.

La aplicación ofrece un camino alternativo cuando la conversación directa resulta inviable, inadecuada, interrumpida o insuficiente. La aplicación comienza cuando A prepara una invitación.

## Flujo privado de v0.1

El alcance actual es un solo caso privado entre A y B. A escribe `How I see it` y prepara una invitación. B recibe esa perspectiva y escribe la propia. Después, cada persona parafrasea a la otra, confirma o aclara la paráfrasis y se itera hasta que ambas confirmen la comprensión. Solo entonces pueden plantear `What I’m asking for now`.

La comprensión confirmada es el requisito previo a los pedidos posteriores. Es una decisión de producto central y no equivale a acuerdo.

## Arquitectura privada acordada

La fase privada usa cápsulas cifradas autocontenidas. El servidor de la aplicación no almacena el caso: cada turno transporta el estado completo mediante el canal elegido, por lo que el intercambio es asincrónico. `caseId` y `revision` mantienen la continuidad entre turnos.

Una versión redactada puede pasar a semipública o pública solamente con consentimiento explícito. Blockchain registra el consentimiento, el hash, la fecha y el estado; el historial privado permanece fuera de la cadena.

## Implementación actual

La interfaz está implementada con Next.js. `web/src/app/page.tsx` permite a A redactar `How I see it`, revisar la invitación y generar el enlace cifrado. `web/src/app/invite/page.tsx` implementa la ruta estática `/invite`: descifra la cápsula, presenta la perspectiva de A, permite que B escriba la propia y genere el enlace de respuesta, y luego guía a cada persona a parafrasear a la otra, confirmar o pedir aclaración, hasta que ambas confirmen la comprensión mutua. Cuando se alcanza la comprensión confirmada, `/invite` muestra el botón "Open to solvers" que abre el caso a la comunidad en un solo click (ver sección Resumen automático).

`web/src/lib/invitations/crypto.ts` implementa cifrado local independiente de React y Next.js mediante la Web Crypto API y AES-256-GCM. El tipo central `Invitation` tiene cinco campos: `schemaVersion`, `caseId`, `revision`, `perspectives` (`inviter: string`, `invitee?: string`) y `paraphrases` (`inviter?: Paraphrase`, `invitee?: Paraphrase`). `Paraphrase` contiene `text`, `status` (`"pending" | "clarificationRequested" | "accepted"`) y `clarification?`; `Participant` es el tipo unión `"inviter" | "invitee"`. Cada invitación recibe una clave aleatoria de 256 bits y cada cifrado un IV aleatorio de 96 bits. El sobre de cifrado (`EncryptedInvitationEnvelope`) conserva solo `version`, `algorithm`, `iv` y `ciphertext`; `iv` y `ciphertext` viajan codificados como base64url.

El sobre es el único artefacto apto para almacenar. La `decryptionKey` se devuelve por separado y debe circular por un canal distinto.

## Backend de casos y contrato Sepolia

`web/src/lib/cases/` implementa el almacenamiento server-side para la fase de
apertura a solvers. `createCaseStore(client)` es una fábrica que recibe cualquier
implementación de `KvClient`, lo que permite tests sin Redis real. El singleton
`caseStore` usa `@upstash/redis` e inicializa el cliente de forma diferida (lanza en
el primer uso, no al importar). Las operaciones cubren creación de casos, estado
(`opened / closed / solved`), contribuciones de solvers y resumen público. Cinco
rutas API bajo `web/src/app/api/cases/` exponen estas operaciones.

`web/src/lib/chain/registry.ts` implementa `CaseRegistryClient` (ethers v6):
convierte el `caseId` string a `bytes32` vía `keccak256` y llama `openCase`,
`closeCase` y `solveCase` en el contrato. `getCaseRegistryClient()` lanza si las
variables de entorno (`CASE_REGISTRY_RPC_URL`, `CASE_REGISTRY_BACKEND_PRIVATE_KEY`,
`CASE_REGISTRY_CONTRACT_ADDRESS`) no están definidas.

`contracts/CaseRegistry.sol` es el registro on-chain: guarda un hash de estado y un
enum (`None / Opened / Closed / Solved`) por `caseId`; no almacena contenido. Hardhat
3 con 13 tests pasando. Desplegado en Sepolia:
`0x3a53Ec28B5DD9c253C893eE1354083Bad3Cea98A`.

La integración de Vercel Marketplace para Upstash inyecta
`UPSTASH_REDIS_KV_REST_API_URL` / `UPSTASH_REDIS_KV_REST_API_TOKEN` — con el
nombre del store en el medio — en lugar de `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` que sugiere la documentación genérica de Upstash.
`createRedisClient()` acepta los tres variantes de nombres como alias.

Una simplificación marcada como PROVISIONAL en el código:

- Las transiciones on-chain las firma un único `backendSigner` del backend (en lugar
  del consentimiento por parte vía Privy — deferred to bonus phase).

El resumen se genera mediante llamada directa a Claude Haiku — implementado en
Fase 5. Chainlink CRE queda para la fase bonus.

## Vitrina pública y aportes de solvers

`web/src/app/showcase/page.tsx` es un Server Component con
`export const dynamic = "force-dynamic"` que lista todos los casos con estado
`opened`, ordenados por fecha de creación descendente mediante
`sortCasesByCreatedAt` exportado desde `public-view.ts`. Cada tarjeta enlaza a
la página de detalle correspondiente.

`web/src/app/showcase/[caseId]/page.tsx` (Server Component, también
`force-dynamic`) muestra el resumen del caso, la lista de aportes recibidos en
orden cronológico y el componente `ContributionForm`. Solo expone lo que
devuelve `toPublicCase()` más los aportes — el historial cifrado nunca llega
al cliente.

`web/src/app/showcase/[caseId]/contribution-form.tsx` (client component) es un
formulario de texto libre que hace `POST` a
`/api/cases/[caseId]/contributions`. Si el caso no está en estado `opened`,
muestra un aviso y no permite enviar. En éxito llama a `router.refresh()` para
refrescar los datos desde el servidor.

`web/scripts/seed-cases.mjs` simula el flujo privado completo de A/B con las
funciones de `crypto.ts` (4 escenarios: roommates, coworkers, hermanos,
cofundadores) y publica cada caso vía `POST /api/cases`. Apuntable a producción
con `BASE_URL=https://conflict-as-a-bug.vercel.app`.

`web/src/app/showcase/[caseId]/summary-poller.tsx` (client component) corre un
`setInterval` de 3 segundos que llama a `router.refresh()` hasta 10 veces
mientras el caso no tiene summary. El Server Component deja de renderizarlo en
cuanto el summary aparece, lo que cancela el interval vía el cleanup del
`useEffect`. El indicador visible es "Generating summary…" con `animate-pulse`.

`web/scripts/test-summary-poller.sh` es un smoke test manual que crea un caso,
abre el navegador en su página de detalle, espera 5 segundos y dispara la
generación del resumen — permite observar el comportamiento del poller sin
competir a mano contra el timing. Parametrizable con `BASE_URL`.

## Resumen automático (Fase 5)

`web/src/lib/ai/summarize.ts` llama a Claude Haiku
(`claude-haiku-4-5-20251001`) vía `@anthropic-ai/sdk` con un prompt de
anonimización: describe la situación y cada perspectiva en términos neutrales,
sin identificar a las partes por nombre o rol, en un párrafo de hasta 300
tokens. El SDK lee `ANTHROPIC_API_KEY` del entorno automáticamente.

`POST /api/cases/[caseId]/summary/generate` recibe `{ text: string }` (el
texto plano de las 4 perspectivas/paráfrasis), llama a `generateSummary` y
guarda el resultado con `caseStore.setSummary`. Es idempotente: si el caso ya
tiene summary lo devuelve directamente sin volver a llamar a la IA, evitando
abuso dado que los caseId son públicos.

El botón "Open to solvers" en `/invite` (visible solo cuando
`isMutualUnderstandingConfirmed` es `true`) encadena en un solo click: armar el
texto plano de las 4 perspectivas/paráfrasis, cifrar la invitación de nuevo
(envelope fresco, `decryptionKey` descartada), `POST /api/cases`, y disparar
`POST /api/cases/[caseId]/summary/generate` como fire-and-forget antes de
redirigir a `/showcase/[caseId]` con `router.push`.

## Límite actual

Las 5 fases del camino mínimo están completas y verificadas en producción
(`https://conflict-as-a-bug.vercel.app`) con un flujo real de usuario: A y B
completan el intercambio privado en `/invite` hasta comprensión mutua
confirmada, abren el caso a solvers con un click, el resumen aparece solo en la
vitrina, y cualquier persona puede dejar un aporte desde `/showcase/[caseId]`.

La fase privada entre A y B sigue sin persistencia server-side, por diseño: el
estado viaja cifrado en las URLs y el servidor no almacena el caso.

Pendiente para la fase bonus: firma de transiciones on-chain por parte (Privy)
y lectura del listado de casos desde el contrato en lugar del backend.

## Verificación para continuidad

Desde `web/`:

```sh
npm run lint        # sin warnings
npm run test:crypto # 7/7
npm run build       # / e /invite estáticas; /showcase y /showcase/[caseId] como ƒ (Dynamic)
node --test src/lib/invitations/link.test.mjs  # 4/4; aún sin script en package.json
npm run test:cases        # 7/7 (store con fake in-memory, desde web/)
npm run test:chain-sync   # 7/7 (helpers on-chain con fakes, desde web/)
# desde contracts/:
npm run test:offline      # 13/13 (solc local, sin red)
# poblar vitrina (requiere Next.js corriendo o BASE_URL a producción):
node web/scripts/seed-cases.mjs
# smoke test manual del SummaryPoller:
./web/scripts/test-summary-poller.sh
```

## Flujo de trabajo

Al terminar cada iteración de desarrollo se reemplaza `docs/pending_review.md`. Incluye objetivo, cambios, archivos, verificación, foco de revisión y próximo paso; debe mantenerse conciso y apto para un repositorio público. La persona usuaria ejecuta pruebas, commits y pushes.
