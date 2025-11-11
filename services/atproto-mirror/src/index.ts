import { Contract, JsonRpcProvider, Log } from "ethers";
import { getConfig } from "./config";
import { openDataRegistryAbi, attestationRegistryAbi } from "./abi";
import { AtprotoPoster } from "./atproto";

async function main() {
  const config = getConfig();
  const provider = new JsonRpcProvider(config.RPC_URL, config.CHAIN_ID);

  const registry = new Contract(config.OPEN_DATA_REGISTRY_ADDRESS, openDataRegistryAbi, provider);
  const attestationRegistry = new Contract(config.ATTESTATION_REGISTRY_ADDRESS, attestationRegistryAbi, provider);

  const poster = new AtprotoPoster(config);
  await poster.init();

  console.log("[mirror] watching on-chain events…");

  const publishTopic = registry.interface.getEvent("DatasetPublished")?.topicHash;
  if (!publishTopic) throw new Error("DatasetPublished topic missing");

  const attestTopic = attestationRegistry.interface.getEvent("Attested")?.topicHash;
  if (!attestTopic) throw new Error("Attested topic missing");

  const revokeTopic = registry.interface.getEvent("Revoked")?.topicHash;
  if (!revokeTopic) throw new Error("Revoked topic missing");

  type Watcher = {
    name: string;
    filter: { address: string; topics: string[] };
    lastProcessedBlock: number;
    handler: (log: Log) => Promise<void>;
  };

  const watchers: Watcher[] = [
    {
      name: "publish",
      filter: { address: config.OPEN_DATA_REGISTRY_ADDRESS, topics: [publishTopic] },
      lastProcessedBlock: 0,
      handler: async (log) => {
        const parsed = registry.interface.parseLog(log);
        if (!parsed) return;
        const { proofId, publisher, stationId, ts } = parsed.args as unknown as {
          proofId: string;
          publisher: string;
          stationId: string;
          ts: bigint;
        };
        if (!shouldMirrorStation(stationId, config.stationAllowlist)) return;
        await safePost(poster, {
          kind: "publish",
          proofId,
          stationId,
          actor: publisher,
          timestamp: Number(ts)
        });
      }
    },
    {
      name: "attest",
      filter: { address: config.ATTESTATION_REGISTRY_ADDRESS, topics: [attestTopic] },
      lastProcessedBlock: 0,
      handler: async (log) => {
        const parsed = attestationRegistry.interface.parseLog(log);
        if (!parsed) return;
        const { proofId, reviewer, note } = parsed.args as unknown as {
          proofId: string;
          reviewer: string;
          note: string;
        };
        await safePost(poster, {
          kind: "attest",
          proofId,
          actor: reviewer,
          note,
          timestamp: Math.floor(Date.now() / 1000)
        });
      }
    },
    {
      name: "revoke",
      filter: { address: config.OPEN_DATA_REGISTRY_ADDRESS, topics: [revokeTopic] },
      lastProcessedBlock: 0,
      handler: async (log) => {
        const parsed = registry.interface.parseLog(log);
        if (!parsed) return;
        const { proofId, auditor, reason, ts } = parsed.args as unknown as {
          proofId: string;
          auditor: string;
          reason: string;
          ts: bigint;
        };
        await safePost(poster, {
          kind: "revoke",
          proofId,
          actor: auditor,
          note: reason,
          timestamp: Number(ts)
        });
      }
    }
  ];

  const startBlock = await provider.getBlockNumber();
  watchers.forEach((watcher) => {
    watcher.lastProcessedBlock = startBlock;
  });

  provider.on("block", async (blockNumber) => {
    await Promise.all(
      watchers.map(async (watcher) => {
        if (blockNumber <= watcher.lastProcessedBlock) return;
        const fromBlock = watcher.lastProcessedBlock + 1;
        try {
          const logs = await provider.getLogs({
            ...watcher.filter,
            fromBlock,
            toBlock: blockNumber
          });
          for (const log of logs) {
            await watcher.handler(log);
          }
        } catch (err) {
          console.error(`[mirror] failed to process ${watcher.name} logs`, err);
        } finally {
          watcher.lastProcessedBlock = blockNumber;
        }
      })
    );
  });
}

function shouldMirrorStation(stationId: string, allowlist?: string[]) {
  if (!allowlist || allowlist.length === 0) return true;
  return allowlist.includes(stationId);
}

async function safePost(poster: AtprotoPoster, payload: Parameters<typeof poster.publish>[0]) {
  try {
    await poster.publish(payload);
    console.log(`[mirror] posted ${payload.kind} for ${payload.proofId}`);
  } catch (err) {
    console.error(`[mirror] failed to post ${payload.kind} for ${payload.proofId}`, err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
