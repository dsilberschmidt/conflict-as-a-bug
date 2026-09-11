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

# 9-10 de septiembre de 2026 — Segunda verificación y notas de testing

- Segunda verificación end-to-end exitosa en producción del flujo financiero mínimo,
  con un caso distinto (conflicto de gastos de supermercado entre compañeros de
  cuarto): resumen generado correctamente esta vez sin intervención, tras el fix de
  reintento con backoff aplicado en `handleOpenToSolvers`. Contribución con
  `seekingBackers`, Audit, "Fund this project" — exitoso en el segundo intento tras
  un fallo puntual de "missing revert data" en el primero (causa no diagnosticada;
  ver future.md).
- Nota de testing para sesiones futuras: Privy soporta alias de email con "+"
  (ej. `tuemail+a@gmail.com`, `tuemail+b@gmail.com`) — direcciones distintas para
  Privy, misma bandeja de entrada real, útil para generar identidades de prueba sin
  múltiples cuentas reales. Privy también ofrece "test accounts" oficiales (dashboard
  → User management → Authentication → Advanced → Enable test accounts) con email y
  OTP fijos, pensados para automatización con Playwright, aunque solo mantienen una
  identidad de prueba activa a la vez.
# 10 de septiembre de 2026 — Desarrollo 010: slice aislado de resumen confidencial CRE

- Se creó el worktree `conflict-as-a-bug-chainlink` desde `ca4e941`, en la rama
  `feat/chainlink-confidential-summary`, y el subproyecto aislado
  `cre-confidential-summary/`. No se modificaron `web/`, `openEnvelope`, firmas,
  consentimientos, Privy, relay ni contratos; la generación directa existente
  sigue siendo la vigente.
- Se eligió Chainlink Confidential Workflows con `handlerInTee`. Confidential
  HTTP por sí solo no cubre toda la composición y procesamiento del prompt, y
  el body de un trigger HTTP en claro no tiene garantía documental de
  confidencialidad frente al Workflow DON.
- El protocolo preparado para la futura integración cifra el texto en navegador
  con AES-256-GCM y IV de 12 bytes, envuelve la clave AES con RSA-OAEP/SHA-256 y
  envía un envelope versionado asociado a `keyId`. El workflow obtiene la clave
  privada RSA y `ANTHROPIC_API_KEY` desde Vault dentro del TEE, descifra y llama
  a Haiku, retornando sólo el resumen. El plugin Rust personalizado realiza el
  descifrado porque CRE TypeScript ejecuta Javy/QuickJS/WASM, sin `node:crypto`
  ni disponibilidad documentada de Web Crypto.
- Daniel verificó los unit tests del subproyecto (`npm test`, 6/6) y el
  typecheck sin errores después de corregir las entradas Web Crypto con copias
  explícitas a `ArrayBuffer`. También instaló Rust 1.98.1 con `wasm32-wasip1`,
  Bun 1.4.2, CRE CLI v1.33.0 y Clang 18. El primer build falló por faltar
  `stddef.h`; instalado Clang 18, `make build` generó
  `cre-confidential-summary/wasm/workflow.wasm` compilando workflow TypeScript,
  SDK de Chainlink y plugin Rust.
- Se añadieron `workflow.yaml`, `config.staging.json` y
  `config.production.json`. Aunque el workflow no usa cadena, `project.yaml`
  incorporó un RPC público de Sepolia porque CRE CLI rechazaba iniciar la
  simulación sin esa entrada. Se creó la cuenta CRE y se autenticó la CLI, pero
  el estado informa `Deploy Access: Not enabled`.
- La simulación con `{}` alcanzó el camino simulado de `handlerInTee` y devolvió
  `INVALID_INPUT`. Una simulación positiva, sólo con datos sintéticos, descifró
  mediante el plugin Rust un envelope RSA-OAEP/SHA-256 + AES-256-GCM, llamó
  realmente a Haiku y devolvió un párrafo neutral sin Markdown. Alterar un byte
  del ciphertext devolvió `INVALID_INPUT` antes de Anthropic. El hash WASM
  observado fue `d7295127c04d602089e4df5e185a310df6a87d765b973559cb927398bb8a10ab`.
- La simulación no es un TEE real y los secretos vinieron de variables de
  entorno mediante `secrets.yaml`, no de CRE Vault. No hubo despliegue,
  Workflow DON real, atestación, Vault real, integración web ni verificación de
  confidencialidad en producción. Siguen pendientes acceso de despliegue a
  Confidential Workflows, integración con `web/`, distribución y rotación de
  claves, secretos de producción en Vault, despliegue/verificación sintéticos,
  verificación completa y unión de rama. El estado y fronteras constan en
  `docs/context.md` y `cre-confidential-summary/README.md`.
- `origin/main` se incorporó a la rama mediante `6bbeda1` y se pusheó. Con Node
  24.20.0 pasaron lint, los 40/40 tests de `web/` y `next build`.
- Tras habilitar las variables necesarias para Preview, los redeploys del
  deployment antiguo conservaron su configuración previa; fue necesario crear
  un deployment nuevo desde Git. En ese nuevo Preview, con datos sintéticos, se
  completaron dos identidades y wallets Privy, dos consentimientos firmados,
  apertura del caso, generación del resumen, contribución de solver con
  solicitud de backing, audit simulado y transferencia real en Sepolia. La
  transacción confirmada fue
  `0xda1bca95b24ca5fd0deee636ae2e26dc6b1a3b0354769e55c38efe3a6cab2190`.
- El resumen de `web/` siguió usando el generador directo, no CRE, y devolvió
  un título Markdown antes del párrafo. El primer intento de financiación
  terminó en `estimateGas`; tras esperar y reintentar, la wallet permitió firmar
  y la transferencia pasó. Esto es compatible con un retraso de propagación del
  saldo, pero todavía no está demostrado. Además, el cliente no comprueba hoy la
  respuesta HTTP de `/api/faucet`.
- Antes del merge: impedir títulos Markdown en el generador directo, validar la
  respuesta del faucet y esperar/reintentar de forma controlada hasta que el RPC
  vea el saldo; luego ejecutar tests, build y una prueba corta de Preview.

# 11 de septiembre de 2026 — generador de Preview y hardening de resumen/faucet

- `daa8104` reforzó el prompt del generador directo para devolver sólo un
  párrafo, sin título, heading, label, Markdown, listas ni texto introductorio.
  Añadió una limpieza conservadora que elimina exclusivamente un heading
  Markdown inicial inequívoco, separado por una línea en blanco y con contenido
  posterior; no descarta otros textos.
- Se añadió `web/src/lib/faucet/client.ts`: valida la respuesta HTTP de
  `/api/faucet`, convierte los fallos en errores controlados y, cuando recibe un
  `txHash` válido, hace que el `BrowserProvider` creado tras `switchChain` vea
  una confirmación antes del backing. La espera está acotada a 60 segundos;
  timeout o receipt ausente no dejan la UI indefinidamente en "Sending…".
- Daniel confirmó ocho tests específicos aprobados (tres del resumen y cinco
  del cliente de faucet), además de lint y build. El aviso local de
  `useWallets` es esperable cuando falta `NEXT_PUBLIC_PRIVY_APP_ID`; no indica
  un fallo del flujo provisionado en Preview.
- Se añadió la CLI de desarrollo `web/scripts/generate-confirmed-invitation.mjs`
  y el comando `npm run generate:confirmed-invite -- <base-url>`. Construye con
  las transiciones reales de `crypto.ts` dos perspectivas y dos paráfrasis
  aceptadas, cifra el estado y escribe sólo un enlace `/invite` que abre en
  "Mutual understanding confirmed". Genera un `caseId` nuevo en cada uso y no
  añade consentimientos ni `openEnvelope`, por lo que Privy, resumen y
  faucet/backing siguen siendo reales. No escribe Upstash ni agrega rutas o
  accesos de prueba a la aplicación.
- Hallazgo UX documentado, sin cambio de producto: tras login de Privy hay que
  pulsar otra vez el CTA para firmar. Queda pendiente un botón explícito `Sign
  consent`; esta tanda se concentra en el generador.

# 11 de septiembre de 2026 — smoke de Preview y reintento pre-broadcast

- El smoke de Preview aprobó los 3/3 tests de la CLI y confirmó que el enlace
  generado abre directamente en "Mutual understanding confirmed". B y luego A
  firmaron, el caso se creó, el resumen directo fue un único párrafo limpio sin
  heading Markdown y la redirección al showcase fue correcta.
- El backing volvió a fallar en el primer clic con `missing revert data`
  (`action="estimateGas"`, `code=CALL_EXCEPTION`) pese a que el faucet y cliente
  ya esperan la confirmación. El segundo clic funcionó y produjo la transacción
  Sepolia `0xb1f70f6e148df8e3bd0bd0b646b47b9fa90271a094573291c86bf89fa8cdaf27`.
  Por tanto, esperar sólo el receipt era insuficiente: el fallo sucede antes
  del broadcast.
- Se añadió `send-with-estimate-gas-retry.ts`, con un único reintento interno
  tras una pausa breve de 2 segundos para exactamente `CALL_EXCEPTION` +
  `action === "estimateGas"`. No reintenta
  otra clase de error ni una operación que ya devolvió transacción; tras dos
  fallos muestra un error controlado. Sus tests cubren éxito tras un fallo
  inicial con una única transacción, agotamiento y propagación inmediata de un
  error no reintentable.
- En la PoC, `/showcase/[caseId]` conserva la primera contribución visible y
  oculta el formulario para añadir otra. El backend conserva el soporte de
  múltiples contribuciones para una ampliación futura.
- Se cerró el pendiente UX de etiqueta: después del primer login, `/invite`
  muestra `Sign consent` para el segundo clic que abre la firma. Sin sesión se
  mantienen `Open to solvers` o `Consent to open`, y no hay reanudación
  automática.

# 11 de septiembre de 2026 — smoke final de Preview

- La CLI aprobó 3/3 tests y generó un caso nuevo correctamente. El enlace abrió
  directamente en "Mutual understanding confirmed"; Firefox actuó como B y
  Brave como A. Tras login, ambos CTA cambiaron a `Sign consent` y ambas firmas
  funcionaron. `Opening…` tuvo latencia perceptible, pero terminó creando el
  caso, generando un resumen limpio de un único párrafo sin heading Markdown y
  redirigiendo al showcase.
- Al enviar la primera contribución con `This could use backing`, aparecieron la
  contribución y el flujo Audit/backing, mientras desapareció `Share your
  perspective`. Confirma el límite de una única solución visible de esta PoC,
  aunque el backend conserva su soporte múltiple. La etiqueta estable pasa de
  `seeks backing` a `backing requested`: expresa que la propuesta solicitó apoyo
  y no contradice la tarjeta `Funded`, cuyo estado sólo vive en el cliente y no
  persiste al recargar.
- El reintento automático no eliminó la intermitencia de backing. En este smoke,
  el primer clic agotó los dos intentos `estimateGas` separados por 2 segundos y
  mostró el error controlado. Un segundo clic manual sí permitió aprobar y
  confirmar la transferencia Sepolia
  `0x3db9e3cb85d7a6c4508a797be1732b1c8b6c93ff2ea7fbf6356db62e05eaed69`.
  `sendWithEstimateGasRetry` es una mitigación acotada y segura: sólo reintenta
  el fallo pre-broadcast exacto, evita duplicados y mejora el error, pero no
  resuelve la causa de la intermitencia.
