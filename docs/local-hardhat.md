# Local Hardhat Setup

Follow these steps to run a local Hardhat network and deploy the Phase 1 contracts.

## Prerequisites

Install dependencies in the project root (only needed once):

```bash
pnpm install
```

## 1. Start a local Hardhat node

In the project root run:

```bash
npx hardhat node
```

Keep this process running; it will expose the JSON-RPC endpoint on `http://127.0.0.1:8545` and print default funded accounts.

## 2. Deploy the contracts to localhost

From a new terminal tab in the same directory execute:

```bash
npx hardhat run contracts/scripts/deploy.ts --network localhost
```

The script will compile the contracts and print the deployed addresses for:

- `PublisherRegistry`
- `OpenDataRegistry`
- `AttestationRegistry`
- `PolicyDataView`

> Note: the root `tsconfig.json` configures `ts-node` with `NodeNext` module settings so the TypeScript deploy script can execute without additional flags.

## 3. Point the frontend at the local deployment

Create (or update) `frontend/.env.local` with:

```
NEXT_PUBLIC_OPEN_DATA_REGISTRY=<OpenDataRegistry address>
NEXT_PUBLIC_ATTESTATION_REGISTRY=<AttestationRegistry address>
NEXT_PUBLIC_POLICY_DATA_VIEW=<PolicyDataView address>
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_HARDHAT_RPC_URL=http://127.0.0.1:8545
```

Use the addresses printed in the deploy step. Restart the Next.js dev server after updating the environment file.

## 4. Connect wallets

Use one of the funded Hardhat accounts for the publisher wallet. Upsert reviewer and auditor accounts via `PublisherRegistry.upsertMember` so that the attestation panel in the UI can submit approvals.

You can now exercise the full manual publish → attest → verify workflow against the local network. To reset the environment, stop the node, restart `npx hardhat node`, and rerun the deploy script.
