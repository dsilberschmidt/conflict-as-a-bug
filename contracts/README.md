# contracts

`CaseRegistry.sol` — hash + estado por caso (ver `web/src/lib/cases/`).
Firmado por un único `backendSigner`, PROVISIONAL hasta Privy (ver
`docs/` en el repo raíz, sección Desarrollo 004).

## Compilar y testear (entorno con red completa)

```
npm install
npm run test        # compila con hardhat (descarga solc) y corre los tests
```

## Compilar y testear (entorno sin acceso a binaries.soliditylang.org)

`npx hardhat compile`/`test` descarga el binario de solc desde
`binaries.soliditylang.org`. Si ese dominio no es alcanzable, usá el
compilador `solc` de npm (ya en devDependencies) en vez del downloader de
Hardhat:

```
npm run test:offline    # compila con solc de npm vía test/compile.ts, sin red
```

`test/compile.ts` compila `contracts/CaseRegistry.sol` directamente con
`solc.compile()` (standard-json) y los tests lo usan con
`new ethers.ContractFactory(abi, bytecode, signer)` en vez de
`ethers.getContractFactory`, así evitan también el sistema de artifacts de
Hardhat. Esto es solo para desarrollo local sin red — el deploy real
(Ignition, abajo) sí necesita `npx hardhat compile` funcionando normal.

## Regenerar el ABI para la app Next.js

```
npm run dump-abi
cp CaseRegistry.abi.json ../web/src/lib/chain/CaseRegistry.abi.json
```

## Deploy a Sepolia

Requiere red completa (para compilar) + una clave con fondos de testnet:

```
export SEPOLIA_RPC_URL="https://..."
export BACKEND_SIGNER_PRIVATE_KEY="0x..."

npx hardhat ignition deploy ignition/modules/CaseRegistry.ts \
  --network sepolia \
  --parameters '{"CaseRegistry":{"backendSignerAddress":"0x..."}}'
```

`backendSignerAddress` debe ser la dirección correspondiente a
`BACKEND_SIGNER_PRIVATE_KEY` — es la misma clave que después usa el backend
de la app (`web/src/lib/chain/registry.ts`, env vars
`CASE_REGISTRY_RPC_URL` / `CASE_REGISTRY_BACKEND_PRIVATE_KEY` /
`CASE_REGISTRY_CONTRACT_ADDRESS`) para llamar `openCase`/`closeCase`/`solveCase`.
