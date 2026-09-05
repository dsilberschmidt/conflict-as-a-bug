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

## Decisiones de producto y arquitectura

- El caso v0.1 es privado y limitado a A y B.
- Los pedidos posteriores se habilitan después de la comprensión confirmada.
- La conversación directa es preferida; la práctica con corazón y caracola es recomendada, no obligatoria.
- La aplicación es una alternativa a la conversación directa en las condiciones definidas para v0.1.
- La interfaz se implementa con Next.js; el cifrado se mantiene independiente del framework.
- Solo el sobre cifrado puede almacenarse; la `decryptionKey` debe mantenerse en un canal separado.
- La forma concreta de persistir el sobre y distribuir la clave sigue **pendiente**.

## Estado actual verificado

- El flujo end-to-end está implementado: redactar → generar enlace → `/invite` (leer perspectiva de A, escribir perspectiva de B, generar enlace de respuesta) → parafrasear → confirmar comprensión mutua.
- `npm run lint` pasa sin warnings; `npm run test:crypto` pasa 7/7; `npm run build` compila `/` e `/invite` como rutas estáticas.
- `src/lib/invitations/link.test.mjs` existe y pasa 4/4 con `node --test` pero no está enganchado a ningún script de `package.json`; convendría agregar `test:link` o unificar ambas suites en un único script.

## Próximas entradas

- **Fecha — hito:** resumen breve.
- **Decisión:** decisión tomada o **pendiente**.
- **Estado:** implementado, en curso o pendiente.
