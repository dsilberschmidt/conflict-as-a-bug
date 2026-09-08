# Histórico cerrado — Pieza B: UI de consentimiento en /invite

Esta especificación se conserva como registro previo. La implementación final incorporó dos correcciones posteriores a este brief: actualizar el estado local de la invitación después de la primera firma, y separar login y firma en dos acciones explícitas. Consultar `../context.md` para el estado final; no usar este texto para reabrir decisiones cerradas.

# Pieza B — UI de consentimiento en /invite

Este brief es para la herramienta de código que ejecute la tarea —
indistintamente Claude Code, Codex, o cualquier otra. Transmitile siempre,
junto con este brief, las normas de trabajo del proyecto (archivo
`normas-de-trabajo-cab.md` adjunto aparte, o pegalas al principio de este
mismo documento si la herramienta no soporta adjuntos separados) — el
circuito de `pending_review.md`, quién corre qué, y cómo se revisa. Sin esas
normas, la herramienta tiende a asumir su propio flujo por defecto (aplicar
directo, correr tests ella misma, resumir en prosa en vez de pegar el diff
real), que no es el que usa este proyecto.

## Contexto que ya está resuelto (no lo reabras)

Hoy se construyó la integración de Privy para reemplazar la firma única del
backend por consentimiento real de cada parte, en varias piezas ya cerradas y
pusheadas a `main`. Dos correcciones de diseño importantes ya se aplicaron —
no las repitas:

1. **Las firmas son sobre un envelope fijo, no sobre texto plano.** El
   contenido cambia según cómo se procese después (resumen directo hoy,
   quizás Chainlink CRE mañana) — atar la firma a eso la volvía transitoria.
   En cambio: quien firma primero genera el cifrado **una sola vez**
   (`encryptInvitation`), ese envelope específico se guarda en el propio
   objeto `Invitation` (`openEnvelope`), y ambas firmas son sobre el hash de
   *ese* envelope fijo — no se vuelve a generar.

2. **`consents` es un array, sin roles.** El contrato no distingue
   "inviter"/"invitee" — solo exige dos direcciones *distintas* firmando el
   mismo hash. Y en esta etapa del flujo (pantalla "confirmed"), la app no
   tiene forma de saber qué rol tiene quien está mirando la pantalla — los
   datos ya son simétricos en ese punto. La branch correcta se determina
   comparando la dirección de wallet que resulta de firmar contra las
   direcciones ya presentes en `consents`, no por rol.

## Piezas ya construidas (usalas, no las reescribas)

### `web/src/lib/invitations/crypto.ts`

```ts
export interface Consent {
  address: string;
  signature: string;
}

// En Invitation:
consents?: Consent[];          // 0, 1 o 2 elementos, direcciones únicas
openEnvelope?: EncryptedInvitationEnvelope;

export function addConsent(invitation: Invitation, consent: Consent): Invitation
// Agrega a consents. Tira si ya hay 2, o si la dirección ya está presente.

export function bothConsented(invitation: Invitation): boolean
// true si consents.length === 2

export function setOpenEnvelope(
  invitation: Invitation,
  envelope: EncryptedInvitationEnvelope,
): Invitation
// Guarda el envelope fijo. Tira si ya estaba seteado (solo una vez, lo genera
// quien firma primero).
```

Las tres avanzan `revision` internamente, mismo patrón que el resto de las
funciones mutadoras del archivo (`submitParaphrase`, etc.) — no le pases vos
la revision, lo hacen solas.

### `web/src/lib/privy/useConsentSigner.ts`

```ts
export function useConsentSigner() {
  // ...
  async function signConsentMessage(caseId: string, content: string): Promise<Consent>
  // Dispara login de Privy si hace falta, firma keccak256(caseId ++ keccak256(content))
  // con la wallet embebida vía EIP-1193 directo (BrowserProvider + signer.signMessage
  // sobre bytes crudos) — verificado contra los tipos reales del SDK instalado, no
  // asumido. Devuelve { address, signature }.

  return { signConsentMessage };
}
```

Para esta pieza, `content` siempre debe ser `JSON.stringify(openEnvelope)` —
el mismo string exacto que el servidor va a recalcular al relayar (ver
`POST /api/cases`, ya actualizado, no lo toques).

### `web/src/lib/privy/PrivyClientProvider.tsx`

Ya envuelve la app en `layout.tsx`. Si `NEXT_PUBLIC_PRIVY_APP_ID` no está
definida, renderiza `children` sin más — no debería romper nunca.

### `POST /api/cases` (ya actualizado, Pieza C, no lo toques)

Espera:
```ts
{ caseId: string, envelope: EncryptedInvitationEnvelope, consents: [Consent, Consent] }
```
Exactamente 2 consents, o 400. Crea el caso en Upstash, relaya las dos firmas
al contrato en secuencia (`tryConsentOnChain` x2), devuelve 201 con el caso
público. Fire-and-forget respecto al contrato — si una firma falla on-chain,
el caso igual queda creado en Upstash (reconciliación pendiente, ya
documentado como PROVISIONAL en otro lado, no es tu problema en esta pieza).

`POST /api/cases/[caseId]/summary/generate` sigue existiendo tal cual estaba
— se sigue llamando aparte, fire-and-forget, con el texto plano armado igual
que antes (concatenación de perspectivas/paráfrasis). No cambia.

## Lo que falta construir: la pantalla `confirmed` de `/invite`

Archivo: `web/src/app/invite/page.tsx`. Ya existe un bloque
`workflow.kind === "confirmed"` que muestra las 4 perspectivas/paráfrasis y,
hoy, un botón único "Open to solvers" que llama a un `handleOpenToSolvers`
viejo (que pegaba directo a `POST /api/cases` sin firmas — **hay que
reemplazar ese handler entero**, ya no es válido con el nuevo contrato de la
ruta).

También existe un helper reutilizable ya usado en todo el archivo:

```ts
async function createLink(updatedInvitation: Invitation, nextShareLabel: string)
```

Cifra `updatedInvitation` (envelope de **transporte**, distinto del
`openEnvelope` fijo — esto es solo el sobre para pasar el link, se re-genera
cada vez, no confundir los dos), arma el link, lo pone en el estado
`updatedLink`/`linkMessage`, y dispara `navigator.share` si está disponible.
Hay una sección de JSX ya existente más abajo en el archivo que renderiza
`updatedLink` automáticamente con botón de copiar — no hace falta construir
UI nueva para "acá está el link, compartilo", ya existe y se reusa sola en
cuanto `updatedLink` tiene un valor.

Estados ya existentes en el componente, reusables: `isCreating`, `setError`,
`error`. Podés agregar un estado nuevo tipo `infoMessage` si hace falta un
mensaje neutro ("ya firmaste, esperando a la otra persona") — no hay uno hoy.

### Lógica del nuevo handler (reemplaza `handleOpenToSolvers`)

```
const inv = invitation.invitation;
const existingConsents = inv.consents ?? [];

if (existingConsents.length === 0) {
  // Primera persona en llegar acá.
  const { envelope } = await encryptInvitation(inv);       // openEnvelope fijo, una sola vez
  const consent = await signConsentMessage(inv.caseId, JSON.stringify(envelope));
  let updated = setOpenEnvelope(inv, envelope);
  updated = addConsent(updated, consent);
  await createLink(updated, "Ask the other person to open this to solvers too");
  return;
}

// Ya hay una firma. Firmar de nuevo revela mi dirección — recién ahí sabemos
// si soy la misma persona (revisitando) o la segunda parte.
const consent = await signConsentMessage(inv.caseId, JSON.stringify(inv.openEnvelope));

if (existingConsents.some((c) => c.address === consent.address)) {
  // Soy la misma wallet que ya firmó — no hay nada nuevo que hacer.
  setInfoMessage("You've already consented. Waiting for the other person.");
  return;
}

// Soy la segunda parte. Ya están las dos firmas — finalizar.
const updated = addConsent(inv, consent);
const plaintext = [ /* misma concatenación de perspectivas/paráfrasis que ya arma el handler viejo */ ];

const response = await fetch("/api/cases", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    caseId: inv.caseId,
    envelope: inv.openEnvelope,
    consents: updated.consents,   // los 2 elementos
  }),
});

// manejo de error igual que el handler viejo (leer .error del body, setError)

void fetch(`/api/cases/${inv.caseId}/summary/generate`, { ... });  // igual que antes, fire-and-forget

router.push(`/showcase/${inv.caseId}`);
```

### El botón en el JSX

Reemplazá el botón único "Open to solvers" por lógica condicional según
`existingConsents.length` (0 → label "Open to solvers"; 1 → label "Consent to
open", ya que no sabemos de antemano si terminará en "ya firmé" o en
"finalizar" hasta después de firmar — está bien que el label no lo prediga
con certeza, se resuelve dentro del handler). Si `bothConsented(inv)` es
`true` de entrada (alguien recarga la página en un estado ya completo, caso
borde raro), no mostrés el botón — mostrá algo simple tipo "This case has
already been opened" y listo, no hace falta más.

Mostrá `infoMessage` si está seteado, mismo estilo visual que ya usa `error`
(`role="alert"`, mismo tono `text-stone-600`, sin necesidad de rojo/alarma ya
que no es un error).

## Protocolo de esta sesión (mantenelo)

Cada cambio se propone en `docs/pending_review.md` — objetivo, diff real
(`git diff`, o `git add -N` + `git diff` para archivos nuevos, pegado tal
cual, no un resumen en prosa), verificación. **No corras nada vos** más allá
de `npm run lint`/`npm run build` para confirmar que compila — ni tests que
dependan de red real, ni commits, ni push. Eso lo hace Daniel después de que
otra instancia (yo, si retomo este chat, o quien lo revise) lo apruebe.

No hay tests automáticos razonables para el flujo de firma en sí (necesita
una wallet Privy real) — no inventes mocks forzados para esto.

