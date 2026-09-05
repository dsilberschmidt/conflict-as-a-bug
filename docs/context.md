# Contexto

## Propósito y principios

Conflict as a Bug explora el conflicto como un problema compartido: A y B pueden describirlo, comprenderse y trabajarlo juntas. El objetivo de v0.1 es alcanzar comprensión mutua confirmada; no exige acuerdo ni resolución.

## Conversación directa y ruta alternativa

La conversación directa es la vía preferida para A y B. Una práctica posible y recomendada consiste en que quien sostiene un corazón hable con cuidado, quien sostiene una caracola escuche con atención y silencio, y luego intercambien los objetos y los roles. Esta práctica es una recomendación, no un requisito.

La aplicación ofrece un camino alternativo cuando la conversación directa resulta inviable, inadecuada, interrumpida o insuficiente. La aplicación comienza cuando A prepara una invitación.

## Flujo privado de v0.1

El alcance actual es un solo caso privado entre A y B. A escribe `How I see it` y prepara una invitación. B recibe esa perspectiva y escribe la propia. Después, cada persona parafrasea a la otra, confirma o aclara la paráfrasis y se itera hasta que ambas confirmen la comprensión. Solo entonces pueden plantear `What I’m asking for now`.

La comprensión confirmada es el requisito previo a los pedidos posteriores. Es una decisión de producto central y no equivale a acuerdo.

## Implementación actual

La interfaz está implementada con Next.js en `web/src/app/page.tsx`. Hoy permite redactar, revisar y volver a editar una perspectiva; el botón `Create invitation` todavía no conecta el flujo con persistencia ni enlace.

`web/src/lib/invitations/crypto.ts` implementa cifrado local, independiente de React y Next.js, mediante la Web Crypto API y AES-256-GCM. Cada invitación recibe una clave aleatoria de 256 bits y cada cifrado un IV aleatorio de 96 bits. El sobre versionado conserva solo `version`, `algorithm`, `iv` y `ciphertext`, codificados como base64url.

El sobre es el único artefacto apto para almacenar. La `decryptionKey` se devuelve por separado y debe circular por un canal distinto. La decisión concreta sobre almacenamiento y distribución del enlace está pendiente.

## Límite actual

No existe todavía la conexión entre `Create invitation`, cifrado, almacenamiento, enlace compartible, respuesta de B, parafraseo ni confirmación. El módulo de cifrado incluye validación de entradas y pruebas unitarias, pero aún no está integrado en la interfaz.

## Verificación para continuidad

Desde `web/`:

```sh
npm run lint
npm run build
npm run test:crypto
```

## Flujo de trabajo

Al terminar cada iteración de desarrollo se reemplaza `docs/pending_review.md`. Incluye objetivo, cambios, archivos, verificación, foco de revisión y próximo paso; debe mantenerse conciso y apto para un repositorio público. La persona usuaria ejecuta pruebas, commits y pushes.
