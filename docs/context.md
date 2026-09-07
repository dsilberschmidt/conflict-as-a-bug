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

La interfaz está implementada con Next.js. `web/src/app/page.tsx` permite a A redactar `How I see it`, revisar la invitación y generar el enlace cifrado. `web/src/app/invite/page.tsx` implementa la ruta estática `/invite`: descifra la cápsula, presenta la perspectiva de A, permite que B escriba la propia y genere el enlace de respuesta, y luego guía a cada persona a parafrasear a la otra, confirmar o pedir aclaración, hasta que ambas confirmen la comprensión mutua.

`web/src/lib/invitations/crypto.ts` implementa cifrado local independiente de React y Next.js mediante la Web Crypto API y AES-256-GCM. El tipo central `Invitation` tiene cinco campos: `schemaVersion`, `caseId`, `revision`, `perspectives` (`inviter: string`, `invitee?: string`) y `paraphrases` (`inviter?: Paraphrase`, `invitee?: Paraphrase`). `Paraphrase` contiene `text`, `status` (`"pending" | "clarificationRequested" | "accepted"`) y `clarification?`; `Participant` es el tipo unión `"inviter" | "invitee"`. Cada invitación recibe una clave aleatoria de 256 bits y cada cifrado un IV aleatorio de 96 bits. El sobre de cifrado (`EncryptedInvitationEnvelope`) conserva solo `version`, `algorithm`, `iv` y `ciphertext`; `iv` y `ciphertext` viajan codificados como base64url.

El sobre es el único artefacto apto para almacenar. La `decryptionKey` se devuelve por separado y debe circular por un canal distinto.

## Backend de casos y contrato (sin desplegar)

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
3 con 13 tests pasando. No está desplegado: requiere RPC URL y clave con fondos de
testnet en Sepolia.

Dos simplificaciones marcadas como PROVISIONAL en el código:

- Las transiciones on-chain las firma un único `backendSigner` del backend (en lugar
  del consentimiento por parte vía Privy — deferred to bonus phase).
- El resumen se producirá mediante llamada a IA externa directa, sin Chainlink CRE
  (deferred to bonus phase).

## Límite actual

El flujo end-to-end está conectado y desplegado en producción (`https://conflict-as-a-bug.vercel.app`).

La fase privada entre A y B sigue sin persistencia server-side, por diseño: el
estado viaja cifrado en las URLs y el servidor no almacena el caso.

La fase de apertura a solvers sí tiene persistencia server-side en Upstash Redis
(ver sección anterior). Lo que no existe todavía es el despliegue del contrato a
Sepolia ni el wiring entre las rutas API y el contrato.

## Verificación para continuidad

Desde `web/`:

```sh
npm run lint        # sin warnings
npm run test:crypto # 7/7
npm run build       # compila / e /invite como estáticas
node --test src/lib/invitations/link.test.mjs  # 4/4; aún sin script en package.json
npm run test:cases        # 7/7 (store con fake in-memory, desde web/)
# desde contracts/:
npm run test:offline      # 13/13 (solc local, sin red)
```

## Flujo de trabajo

Al terminar cada iteración de desarrollo se reemplaza `docs/pending_review.md`. Incluye objetivo, cambios, archivos, verificación, foco de revisión y próximo paso; debe mantenerse conciso y apto para un repositorio público. La persona usuaria ejecuta pruebas, commits y pushes.
