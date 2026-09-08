# Normas de trabajo — Conflict as a Bug

Consolidado de todo lo que se estableció durante el desarrollo (Desarrollo
004 en adelante). Pensado para pegar en cualquier briefing a una herramienta
nueva, o para actualizar `docs/context.md`/`ways-of-working.md` si hace falta.

## Roles

- **Herramienta de código**: agente separado que
  ejecuta tareas sobre el repo.
- **Revisor/coordinador**: planifica y revisa, nunca ejecuta
  directo sobre el repo.
- **Daniel**: corre tests, hace commit y push. Está documentado en el propio
  `docs/context.md` del repo ("La persona usuaria ejecuta pruebas, commits y
  pushes") — no es una preferencia informal, es la convención escrita del
  proyecto.

## El circuito de cada cambio

1. Se le pasa un párrafo con el requerimiento a la herramienta de código.
2. La herramienta propone el cambio concreto y lo devuelve en
   `docs/pending_review.md` — nunca lo aplica directo sin pasar por este paso.
3. Se revisa la propuesta (ver "Cómo revisar" abajo) antes de aprobar.
4. Recién aprobado, la herramienta aplica.
5. Daniel corre la verificación (tests/build) y hace commit + push — la
   herramienta no hace ninguna de las tres cosas.

Nadie ensambla o pega texto a mano directo en los archivos del repo — ese es
justo el paso propenso a error que este circuito existe para evitar.

### `docs/pending_review.md`

`docs/pending_review.md` es el output transitorio del programador o
herramienta de código. Cada respuesta a un prompt reemplaza por completo su
contenido anterior: la respuesta previa se descarta y no se conserva,
reproduce ni acumula dentro de la siguiente.

Puede mantener una estructura útil e incluir, según la tarea, objetivo,
cambios propuestos o aplicados, diff, verificación, estado, actualización del
propio archivo y próximo paso. Debe responder exclusivamente al último prompt
y tener sólo la extensión necesaria para esa respuesta.

No es documentación permanente, bitácora, historial, trazabilidad ni archivo
acumulativo. No debe repetir diffs, artifacts ni explicaciones de tareas
previas sólo porque continúan en el working tree, ni transferir contexto durable
entre sesiones. Toda decisión, evidencia, secuencia, contexto o estado que
deba persistir se escribe en `docs/bitacora.md`, `docs/context.md` u otro
archivo `.md` ad hoc apropiado.

## Disciplina de terminal

- **npm, git commit y git push van siempre en bloques separados** — nunca
  encadenados en el mismo bloque de comandos, ni siquiera commit+push juntos.
- Confirmar siempre en qué directorio está parada la terminal (`pwd` si hay
  duda) antes de dar rutas relativas — la mayoría de los errores de esta
  sesión fueron rutas dadas asumiendo un directorio distinto al real.
- Comandos de solo lectura (`git diff`, `git status`, `pwd`) sí se le pueden
  pedir directo a la herramienta de código — no caen bajo la restricción de
  "Daniel corre tests/commits/pushes", porque no verifican ni cambian estado
  de la forma en que sí lo hace correr un test o hacer un commit.

## Cómo revisar lo que propone la herramienta

- **Cruzar contra el código fuente real, no confiar en el resumen en prosa.**
  Varias veces en esta sesión el resumen no coincidía con el diff real.
- **Para cambios de tamaño o sensibilidad real, pedir el `git diff` real
  pegado tal cual** (con `git add -N <archivo>` primero si son archivos
  nuevos, para que aparezcan en el diff) — no una descripción de qué cambió.
- **Si toca un SDK o librería nueva/desconocida**, verificar la superficie de
  API que dice usar contra los tipos reales del paquete instalado (instalarlo
  en un sandbox aislado y grepear los `.d.ts`, por ejemplo) — no confiar en
  la explicación aunque suene razonable.
- **Si toca un archivo marcado como "núcleo" o "congelado"** (por ejemplo
  `crypto.ts`), pedir el ok explícito antes de tocarlo, incluso para un campo
  opcional aditivo que en teoría no rompe nada existente.

## Documentación

- `docs/bitacora.md` es un **log cronológico**: las entradas pasadas
  describen lo que era cierto en ese momento y **nunca se corrigen
  retroactivamente**, aunque después cambien las decisiones que describen.
- `docs/context.md` es el **estado actual**: cuando algo cambia, hay que
  **corregir** la descripción vieja, no solo agregar la nueva al lado de una
  afirmación que ya quedó falsa.
- Después de una tanda de cambios relacionados sin pausa para documentar,
  vale la pena frenar explícitamente a preguntar si hace falta una pasada de
  documentación — no dejar que se acumule sin registro.

## Estilo

- Mensajes de commit: simples, una sola línea.
- Instrucciones concisas, sin re-explicar contexto que ya se estableció.
- Método de iteración: explorar libremente en la conversación primero,
  consolidar en documentos canónicos recién cuando la decisión está firme —
  no consolidar prematuro ni ejecutar sin pedir antes.
- Los errores propios (de quien revisa) se reconocen directo, sin
  suavizarlos ni minimizarlos.

## Notas operativas
- **Hardhat Ignition** considera un deploy "hecho" en cuanto tiene un journal
  para un `--deployment-id` dado — redesplegar el mismo módulo después de
  cambiar el código fuente necesita un `--deployment-id` nuevo, o Ignition
  puede no hacer nada en vez de redesplegar de verdad.
- `contracts/.gitignore` debe excluir salida regenerable (`/artifacts`,
  `/cache`, `/types`) pero **nunca** `/ignition/deployments` — es el registro
  histórico, no regenerable, de qué se desplegó realmente.
- Cuando dos herramientas trabajan en paralelo sobre el mismo repo, usar un
  `docs/pending_review-<nombre>.md` separado para cada una, para que no se
  pisen escribiendo al mismo archivo (evaluado una vez, no se formalizó como
  regla permanente — decidir caso a caso si vuelve a surgir).
