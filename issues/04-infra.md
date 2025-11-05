# Issue: Infra — IPFS, Sepolia Deploy, CI

## Objective
Wire up storage, deployments, and CI.

## Tasks
- [ ] IPFS pin util & configuration; return `ipfs://CID`
- [ ] Sepolia deploy scripts (Hardhat/Foundry) + .env templates
- [ ] RPC subscriptions for atproto-mirror
- [ ] CI: lint, test, typecheck, contract size/gas report
- [ ] Golden test vectors for hashing & EIP-712 domain checks
- [ ] .env templates for:
      - SEPOLIA_RPC_URL, DEPLOYER_KEY
      - IPFS_API_URL / IPFS_PIN_TOKEN
      - (ATProto) ATPROTO_PDS_URL, ATPROTO_HANDLE, ATPROTO_DID, ATPROTO_SIGNING_KEY

## Acceptance
- Single command deploy to Sepolia
- IPFS pinning returns CID and is reachable via gateway
- CI green on PRs
