# contracts

`CaseRegistry.sol` guarda hash + estado por caso (ver `web/src/lib/cases/`), sin texto. El contrato vigente en Sepolia es `0x0a481Eeb5971ab086e3B7A2c22fe9C37f91fEd6c`.

`consentToOpen` es una meta-transacción pagada por `backendSigner`: recupera dos firmas EIP-191 sobre el mismo `keccak256(abi.encodePacked(caseIdHash, stateHash))`, exige direcciones distintas y avanza `None → PendingConsent → Opened`. `closeCase` y `solveCase` siguen provisionales bajo el backend signer.

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
`CASE_REGISTRY_CONTRACT_ADDRESS`) para llamar `consentToOpen`/`closeCase`/`solveCase`.

Ignition considera desplegado un módulo que ya tiene journal para un `--deployment-id`; cambiar el contrato requiere un ID nuevo para redeploy real. Los journals bajo `ignition/deployments/` se versionan como registro histórico; no contienen claves privadas.
