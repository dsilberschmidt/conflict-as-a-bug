# Contexto

## Propósito y principios

Conflict as a Bug explora el conflicto como un problema compartido: A y B pueden describirlo, comprenderse y trabajarlo juntas. El objetivo de v0.1 es alcanzar comprensión mutua confirmada; no exige acuerdo ni resolución.

## Conversación directa y ruta alternativa

La conversación directa es la vía preferida para A y B. Una práctica posible y recomendada consiste en que quien sostiene un corazón hable con cuidado, quien sostiene una caracola escuche con atención y silencio, y luego intercambien los objetos y los roles. Esta práctica es una recomendación, no un requisito.

La aplicación ofrece un camino alternativo cuando la conversación directa resulta inviable, inadecuada, interrumpida o insuficiente. La aplicación comienza cuando A prepara una invitación.

## Flujo privado de v0.1

El alcance actual es un solo caso privado entre A y B. A escribe `How I see it` y prepara una invitación. B recibe esa perspectiva y escribe la propia. Después, cada persona parafrasea a la otra, confirma o aclara la paráfrasis y se itera hasta que ambas confirmen la comprensión. La idea de formular `What I’m asking for now` pertenece al diseño de producto, pero no existe como campo o etapa separada en la implementación actual.

La comprensión confirmada es el requisito previo a los pedidos posteriores. Es una decisión de producto central y no equivale a acuerdo.

## Arquitectura privada acordada

La fase privada usa cápsulas cifradas autocontenidas. El servidor de la aplicación no almacena el caso: cada turno transporta el estado completo mediante el canal elegido, por lo que el intercambio es asincrónico. `caseId` y `revision` mantienen la continuidad entre turnos.

Una versión redactada puede pasar a semipública o pública solamente con consentimiento explícito. Blockchain registra el consentimiento, el hash, la fecha y el estado; el historial privado permanece fuera de la cadena.

## Implementación actual

La interfaz está implementada con Next.js. `web/src/app/page.tsx` permite a A redactar `How I see it`, revisar la invitación y generar el enlace cifrado. `web/src/app/invite/page.tsx` implementa la ruta estática `/invite`: descifra la cápsula, presenta la perspectiva de A, permite que B escriba la propia y genere el enlace de respuesta, y luego guía a cada persona a parafrasear a la otra, confirmar o pedir aclaración, hasta comprensión mutua. Desde allí abre el consentimiento de dos partes descrito en Resumen automático.

`web/src/lib/invitations/crypto.ts` implementa cifrado local independiente de React y Next.js mediante la Web Crypto API y AES-256-GCM. `Invitation` conserva `schemaVersion`, `caseId`, `revision`, perspectivas y paráfrasis, y añade `consents?: Consent[]` y `openEnvelope?: EncryptedInvitationEnvelope`. `consents` no tiene roles: admite como máximo dos direcciones únicas. `Paraphrase` contiene `text`, `status` (`"pending" | "clarificationRequested" | "accepted"`) y `clarification?`; `Participant` es `"inviter" | "invitee"`. Cada invitación recibe una clave aleatoria de 256 bits y cada cifrado un IV aleatorio de 96 bits. El sobre conserva `version`, `algorithm`, `iv` y `ciphertext` en base64url.

El sobre es el único artefacto apto para almacenar. La `decryptionKey` queda separada del ciphertext y se coloca en el fragmento de la URL, que el navegador no envía al servidor al solicitar la página. Sin embargo, ciphertext y clave se comparten juntos en el enlace completo: ese enlace funciona como secreto portador y quien lo posee puede descifrar el historial. No debe compartirse fuera del canal elegido. La fase privada no se persiste server-side.

## Backend de casos y contrato Sepolia

`web/src/lib/cases/` implementa el almacenamiento server-side para la fase de
apertura a solvers. `createCaseStore(client)` es una fábrica que recibe cualquier
implementación de `KvClient`, lo que permite tests sin Redis real. El singleton
`caseStore` usa `@upstash/redis` e inicializa el cliente de forma diferida (lanza en
el primer uso, no al importar). Las operaciones cubren creación de casos, estado
(`opened / closed / solved`), contribuciones de solvers y resumen público. Cinco
rutas API bajo `web/src/app/api/cases/` exponen estas operaciones.

**Producción actual.** `web/src/lib/chain/registry.ts` implementa
`CaseRegistryClient` (ethers v6) y continúa apuntando al `CaseRegistry` anterior
desplegado en Sepolia (`0x0a481Eeb5971ab086e3B7A2c22fe9C37f91fEd6c`). Para abrir
un caso relaya dos consentimientos EIP-191 (None → PendingConsent → Opened). El
cliente/backend y la interfaz aún no están conectados a los contratos nuevos; por
eso producción conserva el camino anterior, incluido su `solveCase` provisional
controlado por backend. Los casos de ese contrato anterior no serán compatibles
con la nueva resolución.

**Primera tanda local, todavía sin desplegar.** Se implementaron
`contracts/Resolution.sol`, `contracts/Backing.sol` y `contracts/CaseNft.sol`, y
se amplió el nuevo `contracts/CaseRegistry.sol`. Al abrir, este registry conserva
las dos wallets y las devuelve ordenadas canónicamente; su única transición a
`Solved` se delega a la dirección `Resolution` configurada una sola vez. No existe
ya un camino de resolución únicamente controlado por `backendSigner`.

`Resolution` conserva por caso sólo el hash de la idea, la wallet del solver y
`seeksBackers`. Verifica dos firmas EIP-191 de las wallets de apertura sobre la
misma resolución fija. La segunda firma marca resuelto en `Resolution`, llama a
`CaseRegistry.markSolvedFromResolution` y mintea el NFT soulbound del solver en la
misma transacción; si cualquiera de los tres pasos falla, todo revierte.

`Backing` guarda una aprobación de auditor vinculada a `caseId`, hash de idea,
solver y destinataria canónica. Después de resuelto, el único backer elegible hace
el aporte fijo; registrar el backer, transferir el ETH a la destinataria y mintear
su NFT transferible ocurren en una sola transacción o revierten en conjunto.
`CaseNft` limita de forma inmutable los minters de solver y backer y conserva
metadatos mínimos de tipo, `caseId` y fecha.

La tanda local se verificó con `npm run test:offline`: 33/33 tests pasaron. El
commit `ea997be` está pusheado. Aún faltan despliegue de estos contratos, ABIs y
clientes, autenticación/relay backend e interfaz; hasta entonces no hay cambio de
comportamiento en producción.

La integración de Vercel Marketplace para Upstash inyecta
`UPSTASH_REDIS_KV_REST_API_URL` / `UPSTASH_REDIS_KV_REST_API_TOKEN` — con el
nombre del store en el medio — en lugar de `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` que sugiere la documentación genérica de Upstash.
`createRedisClient()` acepta los tres variantes de nombres como alias.

Simplificaciones marcadas como PROVISIONAL en el código:

- `consentToOpen` verifica la firma ECDSA de cada parte on-chain, pero la tx la
  paga el backend como meta-transacción (gas abstraction por parte, deferred).
- `closeCase` y `solveCase` siguen firmados por un único `backendSigner` del
  backend, sin consentimiento por parte vía Privy — deferred to bonus phase.

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

Al alcanzar comprensión mutua, `/invite` abre el flujo de consentimiento. La primera persona cifra una vez y fija `openEnvelope`, firma exactamente `JSON.stringify(openEnvelope)`, añade el consentimiento y genera un enlace de transporte nuevo con la invitación actualizada. La segunda firma el mismo string; su dirección determina si es repetida o la segunda parte. Sólo con dos direcciones distintas se hace `POST /api/cases` y se redirige a `/showcase/[caseId]`.

Privy autentica por email y firma desde la wallet embebida con `getEmbeddedConnectedWallet`, provider EIP-1193, `BrowserProvider` y `signer.signMessage(getBytes(messageHash))`. La UX es explícita en dos pasos: sin sesión, el primer clic abre `login()` y muestra `After signing in, select the button again to sign your consent.`; el segundo abre la firma. Reemplaza una reanudación automática que fallaba lint y prerender. Sin `NEXT_PUBLIC_PRIVY_APP_ID`, el fallback conserva el build; puede avisar `useWallets` fuera del provider, pero `/invite` prerenderiza.

Cliente y contrato calculan primero `caseIdHash = keccak256(UTF-8(caseId))` y `stateHash = keccak256(UTF-8(JSON.stringify(openEnvelope)))`; después `messageHash = keccak256(abi.encodePacked(caseIdHash, stateHash))`. La wallet firma los 32 bytes de `messageHash` con EIP-191 y el contrato recupera esa firma al recibir ambos `bytes32`. La cadena recibe hash, firmas, direcciones y estado, nunca texto.

Para generar el resumen, el navegador envía aparte el texto plano de perspectivas/paráfrasis a `POST /api/cases/[caseId]/summary/generate`, que Anthropic procesa. El `openEnvelope` cifrado queda guardado con el caso; el backend no persiste el historial privado antes de la apertura.

## Límite actual

Las 5 fases del camino mínimo están completas y verificadas en producción
(`https://conflict-as-a-bug.vercel.app`) con un flujo real de usuario: A y B
completan el intercambio privado en `/invite` hasta comprensión mutua
confirmada, abren el caso a solvers con un click, el resumen aparece solo en la
vitrina, y cualquier persona puede dejar un aporte desde `/showcase/[caseId]`.

La fase privada entre A y B sigue sin persistencia server-side, por diseño: el
estado viaja cifrado en las URLs y el servidor no almacena el caso.

La prueba limpia de producción usó dos emails y wallets distintas: B firmó primero, compartió el enlace de espera y A firmó segundo; caso, showcase y resumen funcionaron. Los relays exitosos fueron `0xd0e5669ee472abd146bac02a0fd70bd860597ad7be72f98d17cd2791ef9b018a` (bloque 11662880) y `0x16a6a8c23dee753b8075afb6d594c7f90cafb46b68c594ba8429027fefbe6b4d` (11662881). Los commits de cierre fueron `98df237` y `ccb0dc4`; Daniel confirmó lint y build. Un `Case already exists` anterior provino de atribuir emails incorrectamente a un caso ya abierto.

Pendiente: reconciliación de relays, consentimiento para cierre/resolución, lectura del listado desde cadena y posible Chainlink CRE.

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
npm run test:offline      # 19/19 (solc local, sin red)
# poblar vitrina (requiere Next.js corriendo o BASE_URL a producción):
node web/scripts/seed-cases.mjs
# smoke test manual del SummaryPoller:
./web/scripts/test-summary-poller.sh
```

## Flujo de trabajo

`docs/pending_review.md` es el output transitorio del programador o herramienta de código. Cada respuesta a un prompt reemplaza por completo el contenido anterior; esa respuesta previa se descarta y no se conserva, reproduce ni acumula dentro de la siguiente. Puede incluir objetivo, cambios propuestos o aplicados, diff, verificación, estado, actualización del propio archivo y próximo paso, según la tarea, con sólo la extensión necesaria para responder al último prompt. No es documentación permanente, bitácora, historial, trazabilidad ni contexto durable entre sesiones; no repite diffs, artifacts ni explicaciones de tareas previas sólo porque continúan en el working tree. Lo que deba persistir se registra en `docs/bitacora.md`, `docs/context.md` u otro archivo `.md` ad hoc apropiado. La persona usuaria ejecuta pruebas, commits y pushes.
