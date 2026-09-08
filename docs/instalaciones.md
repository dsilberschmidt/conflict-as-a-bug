# Instalación y entorno local

## Requisitos

Node se gestiona con nvm. La versión definida en `.nvmrc` es `24`:

```sh
nvm install
nvm use
```

La aplicación está en `web/`. Desde allí, instalar dependencias con:

```sh
npm install
```

Para levantar la interfaz básica no hace falta credencial. El flujo completo requiere `NEXT_PUBLIC_PRIVY_APP_ID`; persistencia requiere `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, o los alias aceptados `KV_REST_API_URL` / `KV_REST_API_TOKEN` y `UPSTASH_REDIS_KV_REST_API_URL` / `UPSTASH_REDIS_KV_REST_API_TOKEN`; resumen requiere `ANTHROPIC_API_KEY`; y relay Sepolia requiere `CASE_REGISTRY_RPC_URL`, `CASE_REGISTRY_BACKEND_PRIVATE_KEY` y `CASE_REGISTRY_CONTRACT_ADDRESS`.

## Verificación

Desde `web/`:

```sh
npm run test:crypto
node --test src/lib/invitations/link.test.mjs
npm run lint
npm run build
```

El aviso `MODULE_TYPELESS_PACKAGE_JSON` de las pruebas nativas de Node es conocido e informativo; no afecta la aplicación.

## Stack y configuración

La aplicación usa Next.js, TypeScript, Tailwind y Turbopack. `web/next.config.ts` configura `turbopack.root` con `__dirname` para fijar `web/` como raíz de Turbopack y resolver el proyecto desde esa ubicación.

La revisión de `unrs-resolver` y de su `postinstall` ya fue realizada; `web/package.json` autoriza explícitamente ese script. No hay otros requisitos de instalación fuera de las dependencias de npm.
