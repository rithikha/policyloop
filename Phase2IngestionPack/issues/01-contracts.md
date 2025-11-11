# Issue 01 — Contracts (Fund Registry + Program Modules)

## Objective
Implement verifiable fund governance: one registry and four program modules.

## Tasks
- `FundRegistry.sol`: registerProgram, capOf, spentOf, increaseSpent (onlyModule); events.
- `ProgramModule_Base.sol`: shared issue + auto‑pay; events.
- Four modules:
  - IoT (coveragePermille threshold)
  - Vehicle (eventsProcessed threshold)
  - Fixed (cemsValidPermille threshold)
  - Construction (pm25x10 threshold)
- Unit tests for cap enforcement & basic evaluate() behavior.

## Acceptance
- Compile + tests pass.
- Register 4 programs with caps from Taipei Fund packet (IoT 3.74M; Vehicle 19.8M; Fixed 8.036M; Construction 12.3M).
- Local deploy succeeds.
