# Futuro

Estas líneas son posteriores a la v0.1 ya demostrable. Los aportes libres de solvers en showcase ya existen; su selección, resolución, incentivos y pagos siguen pendientes.

- Almacenamiento cifrado opcional.
- Recuperación de casos y uso en múltiples dispositivos.
- Rotación de claves inspirada en Signal.
- Conflictos con organizaciones.
- Solvers humanos o IA.
- Backers curados por una figura de auditor: revisa pedidos de "busca backers" de los solvers, decide el mecanismo de entrega (directo, con mínimo acumulado, o redirigido a un tercero que pueda entregar algo concreto), reemplazando el diseño naif original (cualquiera deposita, el destinatario acepta o no).
- NFT como certificado de resolución exitosa, para el solver y el backer involucrados.
- Reconciliación durable si Upstash persiste un caso pero falla uno de los relays on-chain.
- Consentimiento de las partes para cierre y resolución, en lugar del backend signer provisional.
- Hardening de producción: autorización, límites, recuperación, auditoría, observabilidad y UX de errores.
- Chainlink CRE u otro procesamiento posterior, sin alterar el `openEnvelope` ya firmado.
