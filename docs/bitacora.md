# Bitácora

## Hitos

- **ETHOnline 2026 — origen:** se plantea Conflict as a Bug como una forma de tratar el conflicto como un problema compartido.
- **v0.1 — producto:** se define un flujo privado entre A y B orientado a comprensión mutua confirmada, no a acuerdo o resolución.
- **v0.1 — conversación directa:** se establece como vía preferida. La práctica recomendada de corazón y caracola propone alternar hablar con cuidado y escuchar con atención; no es obligatoria.
- **v0.1 — ruta alternativa:** la aplicación comienza cuando A prepara una invitación y ofrece un camino cuando la conversación directa es inviable, inadecuada, interrumpida o insuficiente.
- **Interfaz inicial:** `web/src/app/page.tsx` permite redactar `How I see it`, revisar la invitación y volver a editarla.
- **Cifrado de invitaciones:** `web/src/lib/invitations/crypto.ts` añade AES-256-GCM local con claves e IV aleatorios, sobre versionado base64url y clave separada del sobre.
- **Enlace portable:** se implementó y verificó el enlace portable de invitación.
- **Separación en el enlace:** el sobre cifrado viaja en la query y la clave solamente en el fragmento.
- **Verificación:** las pruebas de crypto y enlaces, `lint` y build pasaron.
- **Calendario:** `docs/roadmap.md` queda definido como calendario hacia la submission; el estado técnico vigente pertenece a `docs/context.md`, `docs/bitacora.md` y la documentación específica.
- **5 de septiembre de 2026 — arquitectura privada:** se acuerdan cápsulas cifradas autocontenidas y asincrónicas; el servidor no almacena el caso, `caseId` y `revision` mantienen continuidad, y cualquier versión semipública o pública requiere consentimiento explícito. Blockchain registra consentimiento, hash, fecha y estado, mientras el historial privado permanece fuera de la cadena.
- **5 de septiembre de 2026 — pantalla receptora `/invite`:** `web/src/app/invite/page.tsx` implementa la ruta estática `/invite`: descifra la cápsula desde la URL, presenta la perspectiva de A y confirma que la clave viaja solo en el fragmento.
- **5 de septiembre de 2026 — estado versionado del caso privado:** `crypto.ts` establece el tipo `Invitation` con cinco campos: `schemaVersion`, `caseId`, `revision`, `perspectives` (`inviter: string`, `invitee?: string`) y `paraphrases` (`inviter?: Paraphrase`, `invitee?: Paraphrase`); añade el tipo unión `Participant` (`"inviter" | "invitee"`) y la interfaz `Paraphrase` (`text`, `status`, `clarification?`). `test:crypto` asciende a 7/7.
- **5 de septiembre de 2026 — flujo de respuesta de la persona invitada:** `/invite` permite que B escriba su perspectiva, genere la cápsula de respuesta cifrada y obtenga el enlace para devolver a A.
- **5 de septiembre de 2026 — paráfrasis mutua:** el flujo end-to-end queda implementado y verificado — A y B se parafrasean, confirman o aclaran, y la comprensión mutua confirmada cierra el ciclo.
- **6 de septiembre de 2026 — primer despliegue:** producción en `https://conflict-as-a-bug.vercel.app`; flujo end-to-end verificado en vivo (perspectiva de A → enlace → `/invite` → perspectiva de B → paráfrasis mutua → confirmación). Cierra el hito del 9 de septiembre del roadmap.
- **7 de septiembre de 2026 — Fase 2 cerrada: contrato en Sepolia verificado
  end-to-end:** `POST /api/cases` en producción
  (`https://conflict-as-a-bug.vercel.app`) devuelve 201 y emite una transacción
  real `openCase` confirmada en Sepolia Etherscan contra el contrato
  `0x3a53Ec28B5DD9c253C893eE1354083Bad3Cea98A`. El wiring Upstash ↔ contrato
  funciona en producción. Cierra la Fase 2 del roadmap.
- **8 de septiembre de 2026 — Fase 3: vitrina pública de casos abiertos:**
  `web/src/app/showcase/page.tsx` es un Server Component que lee `caseStore`
  directamente y lista todos los casos con estado `opened`. Los casos se ordenan
  por fecha de creación descendente mediante `sortCasesByCreatedAt` exportado
  desde `public-view.ts`. Requiere `export const dynamic = "force-dynamic"`
  porque Next.js intenta prerenderizar en build time si no se lo indica
  explícitamente — falla sin credenciales de Upstash y produciría datos
  desactualizados incluso si las hubiera. `web/scripts/seed-cases.mjs` simula
  el flujo privado completo de A/B con las funciones de `crypto.ts` (4
  escenarios: roommates, coworkers, hermanos, cofundadores) y llama a
  `POST /api/cases` para cada uno; apuntable a producción vía `BASE_URL`.
- **8 de septiembre de 2026 — Fase 4: página de detalle de caso y formulario
  de aportes:** `web/src/app/showcase/[caseId]/page.tsx` (Server Component,
  `export const dynamic = "force-dynamic"`) muestra el resumen del caso y la
  lista de aportes recibidos en orden cronológico (lista de Redis, ya ordenada).
  `web/src/app/showcase/[caseId]/contribution-form.tsx` (client component)
  expone un textarea que hace `POST` a `/api/cases/[caseId]/contributions`; se
  deshabilita automáticamente si el caso no está en estado `opened`. En éxito,
  limpia el textarea y llama a `router.refresh()` para que la lista de aportes
  se actualice desde el servidor sin duplicar lógica de render en el cliente.
  Las tarjetas de la vitrina son ahora enlaces a la página de detalle.
- **8 de septiembre de 2026 — Fase 5: resumen automático y botón "Open to
  solvers":** `web/src/lib/ai/summarize.ts` encapsula la llamada a Claude Haiku
  (`claude-haiku-4-5-20251001`) vía `@anthropic-ai/sdk`; lee `ANTHROPIC_API_KEY`
  del entorno, genera hasta 300 tokens con un prompt de anonimización (describe
  la situación y cada perspectiva en términos neutrales, sin identificar a las
  partes). `POST /api/cases/[caseId]/summary/generate` es idempotente: si el
  caso ya tiene summary lo devuelve directo sin volver a llamar a la IA — evita
  abuso dado que los caseId son públicos. En `/invite`, cuando
  `isMutualUnderstandingConfirmed` es `true`, aparece el botón "Open to solvers"
  que en un solo click arma el texto plano de las 4 perspectivas/paráfrasis,
  crea el caso vía `POST /api/cases` con una encriptación nueva generada en el
  momento (el `decryptionKey` se descarta), dispara la generación del resumen
  sin bloquear el redirect (fire-and-forget), y redirige a `/showcase/[caseId]`.
  `web/src/app/showcase/[caseId]/summary-poller.tsx` (client component) hace
  `router.refresh()` cada 3 segundos hasta 10 intentos mientras el caso no tiene
  summary; muestra "Generating summary…" con `animate-pulse` como indicador de
  actividad — sin esto la espera parecía colgada. `web/scripts/test-summary-poller.sh`
  es un smoke test manual (no automatizado) que crea un caso, abre el navegador
  en su página de detalle, espera 5 segundos y dispara el resumen, para observar
  el poller en vivo sin competir a mano contra el timing. Verificado end-to-end
  en producción con un flujo real de usuario: A y B completando el intercambio
  en `/invite` hasta comprensión mutua confirmada → click en "Open to solvers"
  → resumen generado apareciendo solo en la vitrina.
- **7 de septiembre de 2026 — backend de casos y contrato (sin desplegar):**
  `web/src/lib/cases/` implementa persistencia server-side en Upstash Redis
  (`@upstash/redis`): fábrica `createCaseStore` con interfaz `KvClient` inyectable
  (testable sin Redis real), operaciones de creación, estado y contribuciones de
  solvers, y singleton `caseStore` que falla en el primer uso (no al importar) si
  faltan credenciales. Cinco rutas API bajo `web/src/app/api/cases/` cubren
  creación, lectura, contribuciones, cambio de estado y resumen. `web/src/lib/chain/`
  agrega `CaseRegistryClient` (ethers v6) y los helpers de hash para interactuar con
  el contrato. `contracts/CaseRegistry.sol` define el registro on-chain: hash de
  estado + enum (`None / Opened / Closed / Solved`) por `caseId` — sin contenido
  on-chain. Firmado por un único `backendSigner` del backend (PROVISIONAL: sustituye
  el consentimiento por parte vía Privy). El resumen será producido por llamada a IA
  externa directa (PROVISIONAL: sin Chainlink CRE). Hardhat 3 con 13 tests pasando;
  contrato no desplegado — requiere RPC URL y clave con fondos en Sepolia.

- **8 de septiembre de 2026 — redeploy del contrato y actualización del cliente
  on-chain:** `CaseRegistry.sol` redesplegado en Sepolia con soporte para
  consentimiento de dos partes: nuevo estado `PendingConsent` en el enum, función
  `consentToOpen` que verifica una firma ECDSA (personal_sign) por parte y mueve
  el caso None → PendingConsent → Opened en dos llamadas. La tx la paga el backend
  como meta-transacción (PROVISIONAL: las partes no tienen ETH en sus wallets
  Privy al momento de creación). Dirección nueva:
  `0x0a481Eeb5971ab086e3B7A2c22fe9C37f91fEd6c`; la anterior
  (`0x3a53Ec28B5DD9c253C893eE1354083Bad3Cea98A`) queda obsoleta.
  `CASE_REGISTRY_CONTRACT_ADDRESS` actualizado en Vercel en el mismo momento del
  redeploy. ABI regenerado con `npm run dump-abi` y copiado a
  `web/src/lib/chain/`. `registry.ts` actualizado: `ChainCaseStatus` con los
  cinco valores nuevos, `openCase` eliminada, `consentToOpen(caseId, content,
  signature)` agregada. `sync.ts`: `tryOpenOnChain` eliminada,
  `tryConsentOnChain` exportada (sin wiring en `route.ts` todavía — el cableado
  espera la firma off-chain desde la UI de Privy). `sync.test.mjs`: 7/7.

## Decisiones de producto y arquitectura

- El caso v0.1 es privado y limitado a A y B.
- Los pedidos posteriores se habilitan después de la comprensión confirmada.
- La conversación directa es preferida; la práctica con corazón y caracola es recomendada, no obligatoria.
- La aplicación es una alternativa a la conversación directa en las condiciones definidas para v0.1.
- La interfaz se implementa con Next.js; el cifrado se mantiene independiente del framework.
- Solo el sobre cifrado puede almacenarse; la `decryptionKey` debe mantenerse en un canal separado.
- La forma concreta de persistir el sobre y distribuir la clave sigue **pendiente**.
- La apertura de un caso a solvers persiste en el servidor (Upstash Redis). La fase
  privada A/B sigue sin persistencia server-side por diseño.
- `consentToOpen` verifica la firma ECDSA de cada parte on-chain; el backend relaya
  como meta-transacción (PROVISIONAL: gas por parte, deferred). `closeCase` y
  `solveCase` siguen con un único signer del backend (PROVISIONAL, deferred to bonus
  phase). El resumen se genera mediante llamada directa a Claude Haiku vía
  `@anthropic-ai/sdk`, implementado en Fase 5. Chainlink CRE queda para la fase bonus.
- La integración de Vercel Marketplace para Upstash inyecta
  `UPSTASH_REDIS_KV_REST_API_URL` / `UPSTASH_REDIS_KV_REST_API_TOKEN` (con el
  nombre del store en el medio), no `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN` como sugiere la documentación genérica de Upstash.
  `createRedisClient()` acepta los tres alias para no depender del nombre exacto
  que inyecte cada integración.

## Estado actual verificado

- El flujo end-to-end está implementado: redactar → generar enlace → `/invite` (leer perspectiva de A, escribir perspectiva de B, generar enlace de respuesta) → parafrasear → confirmar comprensión mutua.
- `npm run lint` pasa sin warnings; `npm run test:crypto` pasa 7/7; `npm run build` compila `/` e `/invite` como rutas estáticas.
- `src/lib/invitations/link.test.mjs` existe y pasa 4/4 con `node --test` pero no está enganchado a ningún script de `package.json`; convendría agregar `test:link` o unificar ambas suites en un único script.
- `npm run test:cases` (desde `web/`) corre 7 tests del store con fake in-memory;
  pasa sin Redis real.
- `npm run test:offline` (desde `contracts/`) corre los 13 tests del contrato con
  `solc` local; pasa sin red.
- `npm run test:chain-sync` (desde `web/`) corre 7 tests de los helpers on-chain
  con fakes; pasa sin red.
- `POST /api/cases` crea el caso en Upstash y devuelve 201. El wiring on-chain
  (`tryConsentOnChain`) está pendiente — exportado en `sync.ts` pero no cableado
  en la ruta todavía.
- `/showcase` y `/showcase/[caseId]` aparecen como ƒ (Dynamic) en el build.
- `web/scripts/seed-cases.mjs` pobla la vitrina con 4 escenarios reales
  apuntando a `BASE_URL` (default: localhost; producción con
  `BASE_URL=https://conflict-as-a-bug.vercel.app`).
- Flujo de usuario real verificado end-to-end en producción: comprensión mutua
  confirmada en `/invite` → "Open to solvers" → caso en vitrina con resumen
  generado por IA → aporte de solver desde `/showcase/[caseId]`.
- `web/scripts/test-summary-poller.sh` permite observar el SummaryPoller en vivo
  apuntando a localhost o producción vía `BASE_URL`.

## Próximas entradas

- **Fecha — hito:** resumen breve.
- **Decisión:** decisión tomada o **pendiente**.
- **Estado:** implementado, en curso o pendiente.

# 8 de septiembre de 2026 — Consentimiento de dos partes, cierre de piezas y verificación

- Se completaron las piezas A, B y C: helper de firma Privy, UI de `/invite` y creación/relay del caso.
- Se redeplegó `CaseRegistry` en Sepolia a `0x0a481Eeb5971ab086e3B7A2c22fe9C37f91fEd6c`; el registro completo de Ignition se conserva para reproducibilidad.
- La solución final fija un `openEnvelope` en la primera firma y usa dos consentimientos sin roles de direcciones distintas. La UX de login y firma es explícitamente de dos clics tras descartar una reanudación automática que fallaba lint y prerender.
- En prueba limpia de producción, dos emails y wallets embebidas distintas abrieron un caso, llegaron al showcase y generaron resumen. Los relays fueron exitosos: `0xd0e5669ee472abd146bac02a0fd70bd860597ad7be72f98d17cd2791ef9b018a` (bloque 11662880) y `0x16a6a8c23dee753b8075afb6d594c7f90cafb46b68c594ba8429027fefbe6b4d` (11662881).
- Daniel confirmó `npm run lint` y `npm run build`; persiste sólo el aviso no bloqueante de `useWallets` sin provider cuando falta App ID.

# 9 de septiembre de 2026 — Primera tanda de resolución y backing local

- Se implementaron localmente `Resolution`, `Backing` y `CaseNft`, junto con la
  ampliación de `CaseRegistry` para conservar las dos wallets de apertura y
  delegar `Solved` exclusivamente en `Resolution`.
- La segunda firma EIP-191 de resolución actualiza atómicamente `Resolution` y
  `CaseRegistry`, y mintea en esa misma transacción el NFT soulbound del solver.
- La aprobación de auditor queda ligada a caso, hash de idea, solver y
  destinataria; el aporte fijo del backer, la transferencia inmediata y el NFT
  transferible del backer son atómicos.
- `npm run test:offline` pasó 33/33 tests. El commit `ea997be` está pusheado.
- Los contratos de esta tanda todavía no están desplegados ni conectados al
  backend o la interfaz. Producción sigue usando el `CaseRegistry` anterior, y
  sus casos no serán compatibles con la nueva resolución.

# 9 de septiembre de 2026 — Identidad Privy server-side (tanda 008)

- Se implementó `web/src/lib/privy/server.ts`: módulo reutilizable que verifica
  access tokens Privy y devuelve `{ userId, walletAddress }`. Se verificó el paquete
  correcto leyendo los `.d.ts` reales del tarball: `@privy-io/node@0.34.0`
  (`verifyAuthToken` está `@deprecated`; la API vigente es `verifyAccessToken`).
- Bug detectado y corregido antes del commit: el sort por `walletIndex` estaba en
  el verifier en lugar de en `resolvePrivyIdentity()` — el test 6 expuso que la
  invariante se rompía con un verifier inyectado en orden distinto.
- Corrección de lint: parámetros `_token` y `_userId` en los fakes de test
  generaban 2 warnings; eliminados (las funciones usan el closure).
- 6/6 tests con fakes inyectados, sin red ni variables de entorno. `PRIVY_APP_SECRET`
  provisionada en Vercel y verificada funcionando en producción.

# 9 de septiembre de 2026 — Flujo financiero mínimo (tanda 008-B)

- Se decidió construir una versión recortada del flujo de backing (seekingBackers +
  Audit efímero + faucet + transferencia real) en lugar de integrar
  Resolution/Backing/CaseNft completo, tras verificar contra la página oficial de
  premios de ETHOnline 2026 que "Best financial flow" exige una transferencia real
  ejecutada por una wallet Privy — no alcanza con firmas EIP-191 ni relay de NFT.
- Implementación de la tanda 008-B: `seekingBackers` en `Contribution`,
  `recipientAddress` en `CaseRecord`, `BackerFlow` client component (Audit efímero +
  "Fund this project"), faucet en `POST /api/faucet` con guarda Upstash. El revisor
  (Desarrollo 008) verificó lint, tests y build en sandbox aislado antes de cada
  aprobación; Daniel corrió lint/tests/build en su propia máquina después de cada
  aprobación y antes de cada commit.
- Bug real encontrado en producción: transacción fallaba con "missing revert data
  (action=estimateGas…)" pese a wallet fondeada. Diagnosticado como falta de
  `wallet.switchChain(11155111)` antes de operar la wallet embebida —
  `PrivyClientProvider.tsx` nunca configura `defaultChain`/`supportedChains`, y
  `backer-flow.tsx` es el primer código del proyecto que manda una tx on-chain real
  desde el cliente (todo lo anterior era `signMessage`). Corregido y verificado.
- Prueba end-to-end exitosa en producción: dos wallets Privy distintas, contribución
  con `seekingBackers`, Audit, "Fund this project" con tx real confirmada en Sepolia.
- Nota de proceso: un push anterior de esta tanda quedó sin aplicar en la rama porque
  Claude Code entendió la aprobación de la propuesta como aplicación directa (la
  aprobación debe decir explícitamente "aplicá"); y un cambio de `PRIVY_APP_SECRET`
  en Vercel no tomó efecto hasta un redeploy manual. Ambos ya resueltos; mencionados
  para no repetirlos sin revisión en tandas futuras.
