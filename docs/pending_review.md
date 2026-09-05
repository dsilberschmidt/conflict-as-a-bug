# Revisión pendiente

## Objetivo

Documentar el estado del proyecto para facilitar la continuidad entre Codex, Claude Code y la revisión humana.

## Cambios

- Se crearon `docs/context.md`, `docs/bitacora.md` y `docs/roadmap.md` para concentrar contexto, historial y próximos hitos.
- Se aclaró que la conversación directa es preferida; la práctica con corazón y caracola es recomendada y la aplicación es una ruta alternativa.
- Se incorporó el flujo de entrega mediante `docs/pending_review.md`.
- El cifrado actual usa AES-256-GCM local; el sobre contiene `version`, `algorithm`, `iv` y `ciphertext`, mientras la `decryptionKey` permanece separada.

## Archivos

- `docs/v0.1.md`
- `docs/context.md`
- `docs/bitacora.md`
- `docs/roadmap.md`
- `docs/pending_review.md`

## Verificación

- Esta es una tanda documental.
- La aplicación ya cuenta con 5 pruebas criptográficas, `lint` y build aprobados.
- La revisión documental local queda pendiente.

## Foco de revisión

- Exactitud.
- Privacidad.
- Consistencia entre documentos.
- Utilidad para continuar con otro agente.

## Próximo paso

Conectar `Create invitation` con el cifrado, el almacenamiento del sobre y el enlace compartible. El formato final del enlace y el almacenamiento permanecen **pendientes**.
