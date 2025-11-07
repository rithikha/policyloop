import { Contract, JsonRpcProvider, keccak256, getBytes, verifyMessage } from "ethers";
import { openDataRegistryAbi, computeDatasetDigest } from "./contracts";
import { computeMetadataHash } from "./hash";

export interface VerifyConfig {
  rpcUrl: string;
  registryAddress: `0x${string}`;
  chainId: number;
}

export interface VerifyRequest {
  proofId: `0x${string}`;
  dataset: Buffer;
  metadata: Record<string, unknown>;
  signature?: `0x${string}`;
}

export interface VerifyResult {
  proofId: `0x${string}`;
  onChain: ChainProof;
  computed: {
    contentHash: `0x${string}`;
    metadataHash: `0x${string}`;
    signer?: string;
  };
  checks: {
    content: boolean;
    metadata: boolean;
    signature: boolean | null;
  };
  reasons: string[];
}

export interface ChainProof {
  contentHash: `0x${string}`;
  metadataHash: `0x${string}`;
  publisher: `0x${string}`;
  uri: string;
  version: string;
  stationId: string;
}

export class VerifyService {
  private readonly provider: JsonRpcProvider;
  private readonly contract: Contract;

  constructor(private readonly config: VerifyConfig) {
    this.provider = new JsonRpcProvider(config.rpcUrl, this.config.chainId);
    this.contract = new Contract(config.registryAddress, openDataRegistryAbi, this.provider);
  }

  async verify(request: VerifyRequest): Promise<VerifyResult> {
    const proof = await this.contract.getProof(request.proofId);
    const onChain = this.parseProof(proof);

    const computedContentHash = keccak256(request.dataset) as `0x${string}`;
    const computedMetadataHash = computeMetadataHash(request.metadata);

    const contentMatch = compareHashes(onChain.contentHash, computedContentHash);
    const metadataMatch = compareHashes(onChain.metadataHash, computedMetadataHash);

    let signer: string | undefined;
    let signatureMatch: boolean | null = null;
    if (request.signature) {
      const digest = computeDatasetDigest({
        contentHash: onChain.contentHash,
        metadataHash: onChain.metadataHash,
        uri: onChain.uri,
        version: onChain.version,
        stationId: onChain.stationId,
        publisher: onChain.publisher,
        registry: this.config.registryAddress
      });
      signer = verifyMessage(getBytes(digest), request.signature);
      signatureMatch = signer.toLowerCase() === onChain.publisher.toLowerCase();
    }

    const reasons: string[] = [];
    if (!contentMatch) reasons.push("content hash mismatch");
    if (!metadataMatch) reasons.push("metadata hash mismatch");
    if (signatureMatch === false) reasons.push("signature does not match publisher");

    return {
      proofId: request.proofId,
      onChain,
      computed: {
        contentHash: computedContentHash,
        metadataHash: computedMetadataHash,
        signer
      },
      checks: {
        content: contentMatch,
        metadata: metadataMatch,
        signature: signatureMatch
      },
      reasons
    };
  }

  private parseProof(tuple: readonly unknown[]): ChainProof {
    return {
      contentHash: tuple[0] as `0x${string}`,
      metadataHash: tuple[1] as `0x${string}`,
      publisher: tuple[2] as `0x${string}`,
      uri: tuple[4] as string,
      version: tuple[5] as string,
      stationId: tuple[6] as string
    };
  }
}

function compareHashes(expected: `0x${string}`, actual: `0x${string}`): boolean {
  return expected.toLowerCase() === actual.toLowerCase();
}
