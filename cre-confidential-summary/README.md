# Resumen confidencial CRE

Este es un slice aislado creado en el worktree
`conflict-as-a-bug-chainlink`, rama `feat/chainlink-confidential-summary`,
desde `ca4e941`. No está integrado con `web/`, Privy, relay, firmas,
consentimientos ni contratos. La aplicación desplegada conserva el generador
directo de `web/src/lib/ai/summarize.ts`.

## Arquitectura diseñada

El slice conserva el contrato del generador actual: Anthropic Haiku
`claude-haiku-4-5-20251001`, entrada `{ text: string }`, `max_tokens: 300` y
un resumen neutral y anonimizado. El prompt exige un único párrafo y prohíbe
título, label, heading y Markdown; su test verifica `SYSTEM_PROMPT`.

Se eligió Chainlink Confidential Workflows con `handlerInTee`. Confidential
HTTP por sí solo no protege toda la composición ni el procesamiento del prompt,
y un body HTTP en claro no tiene garantía documental de confidencialidad frente
al Workflow DON. La futura integración debe enviar sólo un envelope cifrado:

```text
{ version, algorithm, keyId, wrappedKey, iv, ciphertext }
```

El navegador cifra el texto con AES-256-GCM, IV de 12 bytes y AAD que vincula
versión, algoritmo y `keyId`. Envuelve la clave AES con RSA-OAEP/SHA-256 usando
la clave pública RSA-2048 asociada a ese `keyId`. El workflow valida el envelope
y, dentro del handler confidencial, obtiene la clave RSA privada y
`ANTHROPIC_API_KEY`, descifra, construye el prompt y llama a Haiku; el único
output autorizado es el resumen.

CRE TypeScript usa Javy/QuickJS/WASM, no soporta `node:crypto` y no documenta
Web Crypto para el workflow. Por ello el descifrado RSA-OAEP/AES-GCM se realiza
en el plugin Rust `tee-hybrid-crypto-plugin/`; Web Crypto se limita al módulo de
navegador.

`workflow.yaml` declara los artefactos y nombres de los workflows de staging y
producción. `config.staging.json` y `config.production.json` son los configs
correspondientes. Aunque este workflow no usa blockchain, `project.yaml` incluye
un RPC público de Sepolia porque CRE CLI rechazó iniciar la simulación sin una
entrada RPC.

## Evidencia de simulación local

- Cuenta CRE creada y CLI autenticada; `Deploy Access: Not enabled`.
- Herramientas verificadas: CRE CLI v1.33.0 y `@chainlink/cre-sdk` 1.20.0.
- `npm test` pasó 6/6, `npm run typecheck` pasó y `make build` pasó. El build
  produjo `wasm/workflow.wasm`, cuyo hash observado fue
  `d7295127c04d602089e4df5e185a310df6a87d765b973559cb927398bb8a10ab`.
- La simulación con `{}` alcanzó el camino simulado de `handlerInTee` y retornó
  `INVALID_INPUT`.
- Una simulación positiva con un envelope sintético RSA-OAEP/SHA-256 +
  AES-256-GCM fue descifrada por el plugin Rust; el workflow llamó realmente a
  Haiku y retornó un resumen neutral de un solo párrafo, sin Markdown.
- Alterar un byte del ciphertext hizo que la simulación retornara
  `INVALID_INPUT` antes de contactar Anthropic.

Las pruebas locales usaron exclusivamente datos sintéticos. Los secretos se
resolvieron desde variables de entorno a través de `secrets.yaml`; no se probó
CRE Vault real. La semántica observada en `src/workflow.ts` es:

| Situación | Error externo |
| --- | --- |
| JSON, envelope, clave RSA o descifrado inválidos | `INVALID_INPUT` |
| Clave Anthropic vacía o fallo HTTP | `PROVIDER_FAILURE` |
| Respuesta exitosa del proveedor mal formada | `INVALID_PROVIDER_RESPONSE` |

## Límites de producción y confidencialidad

El simulador declara expresamente que no es un TEE real. Por tanto, las pruebas
anteriores no prueban un Workflow DON real, atestación, CRE Vault, despliegue ni
confidencialidad en producción.

El diseño establece que, cuando `web/` lo integre correctamente, el navegador
verá el plaintext que cifra, la clave pública y el envelope resultante. El
backend y el Workflow DON recibirán únicamente ciphertext y metadatos públicos.
El TEE verá claves, plaintext, prompt, respuesta y resumen durante la ejecución.
Anthropic necesariamente recibe el plaintext incluido en el prompt. Estas son
las fronteras diseñadas; no son una garantía de producción hasta desplegar y
verificar Confidential Workflows con Vault real.

## Pendientes

1. Solicitar acceso de despliegue a Confidential Workflows.
2. Integrar en `web/` el cifrado de navegador y la invocación a CRE.
3. Definir distribución y rotación de claves públicas/privadas.
4. Cargar secretos de producción en CRE Vault.
5. Desplegar y verificar con datos sintéticos.
6. Verificar la aplicación completa y unir la rama.

## Referencias oficiales

- https://docs.chain.link/cre/concepts/confidential-workflows
- https://docs.chain.link/cre/concepts/typescript-wasm-runtime
- https://docs.chain.link/cre/guides/workflow/secrets/using-secrets-deployed
- https://docs.chain.link/cre/guides/operations/custom-rust-plugins-ts
