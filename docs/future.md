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
- Investigar la intermitencia prolongada de `estimateGas` en `Fund this project`:
  incluso con `switchChain`, faucet confirmado y el reintento interno seguro de
  dos intentos separados por 2 segundos, ambos intentos pueden fallar antes de
  broadcast. El workaround actual es pulsar otra vez `Fund this project` tras el
  error controlado. Falta identificar si la causa es RPC, wallet o timing de red.
- Cambiar el faucet para que considere el saldo actual de la wallet —o un umbral
  de saldo— en vez de basarse exclusivamente en una marca permanente de wallet
  ya financiada; una wallet previamente financiada puede no tener `0.001 SEP`
  más gas para completar el backing.
- Mejorar el manejo de confirmaciones lentas del faucet: si la transacción ya
  fue emitida pero excede los 60 segundos de espera del cliente, conservar y
  reconciliar su estado en vez de obligar a repetir manualmente la acción.
- Reducir la latencia perceptible de `Opening…` durante la creación del caso,
  sin ocultar el estado de progreso ni alterar las firmas, la creación ni la
  generación del resumen.

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
