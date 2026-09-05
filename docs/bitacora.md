# Bitácora

## Hitos

- **ETHOnline 2026 — origen:** se plantea Conflict as a Bug como una forma de tratar el conflicto como un problema compartido.
- **v0.1 — producto:** se define un flujo privado entre A y B orientado a comprensión mutua confirmada, no a acuerdo o resolución.
- **v0.1 — conversación directa:** se establece como vía preferida. La práctica recomendada de corazón y caracola propone alternar hablar con cuidado y escuchar con atención; no es obligatoria.
- **v0.1 — ruta alternativa:** la aplicación comienza cuando A prepara una invitación y ofrece un camino cuando la conversación directa es inviable, inadecuada, interrumpida o insuficiente.
- **Interfaz inicial:** `web/src/app/page.tsx` permite redactar `How I see it`, revisar la invitación y volver a editarla.
- **Cifrado de invitaciones:** `web/src/lib/invitations/crypto.ts` añade AES-256-GCM local con claves e IV aleatorios, sobre versionado base64url y clave separada del sobre.

## Decisiones de producto y arquitectura

- El caso v0.1 es privado y limitado a A y B.
- Los pedidos posteriores se habilitan después de la comprensión confirmada.
- La conversación directa es preferida; la práctica con corazón y caracola es recomendada, no obligatoria.
- La aplicación es una alternativa a la conversación directa en las condiciones definidas para v0.1.
- La interfaz se implementa con Next.js; el cifrado se mantiene independiente del framework.
- Solo el sobre cifrado puede almacenarse; la `decryptionKey` debe mantenerse en un canal separado.
- La forma concreta de persistir el sobre y distribuir la clave sigue **pendiente**.

## Estado actual verificado

- La interfaz muestra los pasos de redacción y revisión, pero `Create invitation` aún no crea ni comparte una invitación.
- El módulo de cifrado exporta creación y descifrado de invitaciones con una perspectiva.
- `test:crypto` pasó con 5 pruebas, incluidas recorrido Unicode, aleatoriedad, clave incorrecta, manipulación y sobres malformados.
- `lint` pasó sin warnings y el build de producción pasó.
- El warning de Node sobre module type es informativo y no afecta la aplicación.

## Próximas entradas

- **Fecha — hito:** resumen breve.
- **Decisión:** decisión tomada o **pendiente**.
- **Estado:** implementado, en curso o pendiente.
