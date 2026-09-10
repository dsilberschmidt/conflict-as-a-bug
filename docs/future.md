# Futuro

Estas líneas son posteriores a la v0.1 ya demostrable. Los aportes libres de
solvers en showcase ya existen. También existe una primera implementación
contractual local de solver único, resolución, NFTs y backing; todavía no está
desplegada ni integrada al backend o la interfaz. Su integración, mecanismos de
producción y ampliaciones de producto siguen pendientes.

- Almacenamiento cifrado opcional.
- Recuperación de casos y uso en múltiples dispositivos.
- Rotación de claves inspirada en Signal.
- Conflictos con organizaciones.
- Solvers humanos o IA.
- Backers curados por una figura de auditor: revisa pedidos de "busca backers" de los solvers, decide el mecanismo de entrega (directo, con mínimo acumulado, o redirigido a un tercero que pueda entregar algo concreto), reemplazando el diseño naif original (cualquiera deposita, el destinatario acepta o no).
- Despliegue e integración de los NFTs ya implementados como certificados de
  resolución exitosa para solver y backer.
- Reconciliación durable si Upstash persiste un caso pero falla uno de los relays on-chain.
- Integración de las dos firmas de resolución ya implementadas en el contrato
  local, y consentimiento de las partes para el cierre en lugar del backend
  signer provisional.
- Hardening de producción: autorización, límites, recuperación, auditoría, observabilidad y UX de errores.
- Chainlink CRE u otro procesamiento posterior, sin alterar el `openEnvelope` ya firmado.
- Paginación del listado público: `listCasesByStatus` usa `smembers` de Redis y
  devuelve todos los casos `opened` sin límite — crece indefinidamente con el uso.
  Decisión explícita de esta sesión: no resolverlo ahora, prioridad es la entrega y
  Chainlink. Si el proyecto tiene uso externo real, dos mejoras baratas quedan
  pendientes: paginación con cursor, o separar/filtrar casos de prueba de casos reales
  en la vista pública.
- Intermitencia de "Fund this project": durante las pruebas del 9-10 de septiembre
  se observó un fallo puntual de "missing revert data (action=estimateGas…)" pese a
  que `switchChain(11155111)` ya estaba aplicado y la wallet tenía balance suficiente;
  reintentar la misma acción funcionó sin cambios. Causa no identificada — posible RPC
  lento o timing de `switchChain`. Anotado como posible intermitencia a vigilar,
  especialmente relevante si se graba una demo en vivo.

## Hardening contractual posterior a la PoC

Estos puntos no bloquean la demo actual, que usa un backend relayer controlado,
no rota claves y no cierra casos con una resolución en curso. Corresponden a
seguridad, recuperación operacional y semántica de una futura producción.

- **Rotación unificada de autoridades:** `CaseRegistry.backendSigner` puede
  rotarse, mientras `Resolution.backendSigner` queda fijado en el constructor.
  Una versión de producción debe permitir que la rotación revoque
  coherentemente la clave anterior en todos los contratos relacionados.
- **Dominio del consentimiento de apertura:** una versión de producción debe
  ligar la firma EIP-191 a la dirección declarada de quien consiente e incluir
  `chainId`, dirección del registry, `caseId`, `stateHash` y una acción
  inequívoca, evitando reutilización entre wallets, contratos, cadenas o
  acciones.
- **Cierre y resolución:** actualmente una idea sólo puede resolverse mientras
  el registry está `Opened`. Antes de producción debe decidirse si una idea
  registrada puede completar su resolución después de `closeCase`, y cubrir
  expresamente esa transición con tests.
