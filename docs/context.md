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

## Límite actual

El flujo end-to-end está conectado. Lo que no existe todavía es persistencia del lado del servidor (por diseño y según la arquitectura acordada: el servidor no almacena el caso) y el despliegue (no hay configuración de Vercel, Netlify ni CI en el repositorio).

## Verificación para continuidad

Desde `web/`:

```sh
npm run lint        # sin warnings
npm run test:crypto # 7/7
npm run build       # compila / e /invite como estáticas
node --test src/lib/invitations/link.test.mjs  # 4/4; aún sin script en package.json
```

## Flujo de trabajo

Al terminar cada iteración de desarrollo se reemplaza `docs/pending_review.md`. Incluye objetivo, cambios, archivos, verificación, foco de revisión y próximo paso; debe mantenerse conciso y apto para un repositorio público. La persona usuaria ejecuta pruebas, commits y pushes.
