"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSignTypedData,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import {
  datasetDomain,
  datasetMetaTypes,
  DatasetMeta,
  OPEN_DATA_REGISTRY_ADDRESS,
  openDataRegistryAbi,
} from "../lib/contracts";
import { keccakFileChunked, computeMetadataHash } from "../lib/hash";
import { validateMetadata } from "../lib/schema";
import { ConnectWallet } from "./ConnectWallet";
import { Hex, parseEventLogs } from "viem";

interface PublishFormState {
  contentHash?: `0x${string}`;
  metadataHash?: `0x${string}`;
  metadataDoc?: Record<string, unknown>;
  datasetMeta?: DatasetMeta;
  txHash?: Hex;
  proofId?: `0x${string}`;
}

interface PublishFormErrors {
  schema?: string[];
  general?: string;
}

const DEFAULT_VERSION = "1.0.0";

export function PublishForm() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { chains, switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData();
  const { writeContractAsync, isPending: isPublishing } = useWriteContract();

  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [uri, setUri] = useState("");
  const [version, setVersion] = useState(DEFAULT_VERSION);
  const [capturedAt, setCapturedAt] = useState(() => Math.floor(Date.now() / 1000));
  const [format, setFormat] = useState<DatasetMeta["format"]>("csv");
  const [license, setLicense] = useState("CC-BY-4.0");
  const [schemaUri, setSchemaUri] = useState("ipfs://schema/moenv-taipei.json");
  const [publisherDid, setPublisherDid] = useState("");
  const [payload, setPayload] = useState("{\n  \"readings\": []\n}");
  const [state, setState] = useState<PublishFormState>({});
  const [errors, setErrors] = useState<PublishFormErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const preferredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? `${sepolia.id}`);

  const explorerBaseUrl = useMemo(() => {
    const activeId = chainId ?? preferredChainId;
    const match = chains?.find((item) => item.id === activeId);
    return match?.blockExplorers?.default.url ?? "https://sepolia.etherscan.io";
  }, [chains, chainId, preferredChainId]);

  const publishDisabledReason = useMemo(() => {
    if (!mounted) return "Connect your wallet to publish.";
    if (!address) return "Connect your wallet to publish.";
    if (!datasetFile) return "Select a dataset file first.";
    if (!state.contentHash || !state.metadataHash || !state.datasetMeta) {
      return "Run Compute Hashes & Validate before publishing.";
    }
    if (!OPEN_DATA_REGISTRY_ADDRESS) {
      return "OpenDataRegistry address missing – check frontend/.env.local and restart the dev server.";
    }
    return null;
  }, [address, datasetFile, state, mounted]);

  const canPublish = mounted && publishDisabledReason === null;

  const handleCompute = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!datasetFile) {
        setErrors({ general: "Select a dataset file before computing hashes." });
        return;
      }

      setStatusMessage("Computing file hash (WASM keccak-256)...");
      setErrors({});
      setIsComputing(true);

      try {
        const contentHash = await keccakFileChunked(datasetFile);

        let parsedPayload: Record<string, unknown> = {};
        if (payload.trim()) {
          try {
            parsedPayload = JSON.parse(payload);
          } catch (err) {
            throw new Error("Payload JSON is invalid.");
          }
        }

        const metadataDoc = {
          stationId: "taipei-city",
          capturedAt,
          format,
          schemaUri,
          license,
          publisherDid: publisherDid || "",
          contentHash,
          payload: parsedPayload,
        };

        const validation = validateMetadata<typeof metadataDoc>(metadataDoc);
        if (!validation.valid) {
          setErrors({ schema: validation.errors });
          throw new Error("Metadata schema validation failed.");
        }

        const metadataHash = computeMetadataHash(metadataDoc);

        const datasetMeta: DatasetMeta = {
          stationId: "taipei-city",
          capturedAt: BigInt(capturedAt),
          format,
          schemaUri,
          license,
          publisherDid: publisherDid || "",
          contentHash,
        };

        setState({
          contentHash,
          metadataHash,
          metadataDoc,
          datasetMeta,
        });
        setStatusMessage("Hashes computed and metadata validated.");
      } catch (err) {
        setState({});
        setStatusMessage(null);
        setErrors((prev) => ({
          ...prev,
          general: err instanceof Error ? err.message : "Failed to compute hashes.",
        }));
      } finally {
        setIsComputing(false);
      }
    },
    [datasetFile, payload, capturedAt, format, schemaUri, license, publisherDid]
  );

  const handleSignAndPublish = async () => {
    if (!canPublish || !state.datasetMeta || !state.metadataHash || !state.contentHash || !state.metadataDoc) {
      return;
    }
    if (!OPEN_DATA_REGISTRY_ADDRESS) {
      setErrors({ general: "OpenDataRegistry address not configured (NEXT_PUBLIC_OPEN_DATA_REGISTRY)." });
      return;
    }

    try {
      const registryAddress = OPEN_DATA_REGISTRY_ADDRESS;
      let activeChainId = chainId ?? preferredChainId;
      if (activeChainId !== preferredChainId) {
        if (switchChainAsync) {
          try {
            await switchChainAsync({ chainId: preferredChainId });
            activeChainId = preferredChainId;
          } catch (switchError) {
            setErrors({ general: "Please switch to the configured network before publishing." });
            return;
          }
        } else {
          setErrors({ general: "Please switch to the configured network before publishing." });
          return;
        }
      }

      setErrors({});
      setStatusMessage("Requesting EIP-712 signature...");

      const typedData = {
        DatasetMeta: datasetMetaTypes.DatasetMeta.map((field) => ({ ...field })),
      };

      const signature = await signTypedDataAsync({
        domain: datasetDomain(activeChainId, registryAddress),
        primaryType: "DatasetMeta",
        types: typedData,
        message: {
          ...state.datasetMeta,
          publisherDid: state.datasetMeta.publisherDid ?? "",
          capturedAt: BigInt(state.datasetMeta.capturedAt),
        },
      });

      setStatusMessage("Publishing dataset on-chain...");

      const txHash = await writeContractAsync({
        address: registryAddress,
        abi: openDataRegistryAbi,
        functionName: "publish",
        args: [state.contentHash, state.metadataHash, uri, version, "taipei-city", signature],
      });

      setState((prev) => ({
        ...prev,
        txHash,
      }));

      setStatusMessage(`Transaction submitted: ${txHash}`);

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        const parsedLogs = parseEventLogs({
          abi: openDataRegistryAbi,
          logs: receipt.logs,
        });
        const datasetPublished = parsedLogs.find(
          (log) => log.eventName === "DatasetPublished"
        );
        const proofId = datasetPublished ? (datasetPublished.args?.proofId as `0x${string}` | undefined) : undefined;

        if (proofId) {
          setState((prev) => ({
            ...prev,
            proofId,
          }));
          setStatusMessage(`Dataset published · proofId ${proofId}`);
        } else {
          setStatusMessage("Dataset published · awaiting indexer confirmation.");
        }
      }
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : "Failed to publish dataset.",
      });
    }
  };

  return (
    <section className="card">
      <header className="card-header">
        <h2>1. Publish Dataset Proof</h2>
        <ConnectWallet />
      </header>
      <form className="form-grid" onSubmit={handleCompute}>
        <label className="form-field">
          <span>MOENV Dataset File</span>
          <input
            type="file"
            accept=".csv,.json"
            onChange={(event) => setDatasetFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <label className="form-field">
          <span>Dataset URI (IPFS preferred)</span>
          <input
            type="text"
            value={uri}
            onChange={(event) => setUri(event.target.value)}
            placeholder="ipfs://cid"
            required
          />
        </label>

        <label className="form-field">
          <span>Schema URI</span>
          <input type="text" value={schemaUri} onChange={(event) => setSchemaUri(event.target.value)} required />
        </label>

        <label className="form-field">
          <span>Dataset Version</span>
          <input type="text" value={version} onChange={(event) => setVersion(event.target.value)} required />
        </label>

        <label className="form-field">
          <span>Captured At (epoch seconds)</span>
          <input
            type="number"
            value={capturedAt}
            onChange={(event) => setCapturedAt(parseInt(event.target.value, 10))}
            min={0}
            required
          />
        </label>

        <label className="form-field">
          <span>Format</span>
          <select value={format} onChange={(event) => setFormat(event.target.value as DatasetMeta["format"])}>
            <option value="csv">csv</option>
            <option value="json">json</option>
          </select>
        </label>

        <label className="form-field">
          <span>License</span>
          <input type="text" value={license} onChange={(event) => setLicense(event.target.value)} required />
        </label>

        <label className="form-field">
          <span>Publisher DID (optional)</span>
          <input type="text" value={publisherDid} onChange={(event) => setPublisherDid(event.target.value)} />
        </label>

        <label className="form-textarea">
          <span>Payload Preview (JSON)</span>
          <textarea value={payload} onChange={(event) => setPayload(event.target.value)} rows={6} />
        </label>

        <div className="form-actions">
          <button type="submit" disabled={isComputing}>
            {isComputing ? "Computing..." : "Compute Hashes & Validate"}
          </button>

          <button
            type="button"
            className="primary"
            onClick={handleSignAndPublish}
            disabled={!canPublish || isSigning || isPublishing}
          >
            {isSigning || isPublishing ? "Publishing..." : "Sign & Publish"}
          </button>
        </div>
        {!isSigning && !isPublishing && publishDisabledReason ? (
          <p className="hint">{publishDisabledReason}</p>
        ) : null}
      </form>

      <div className="form-feedback">
        {statusMessage ? <p className="status">{statusMessage}</p> : null}
        {state.contentHash ? (
          <p>
            <strong>contentHash:</strong> {state.contentHash}
          </p>
        ) : null}
        {state.metadataHash ? (
          <p>
            <strong>metadataHash:</strong> {state.metadataHash}
          </p>
        ) : null}
        {state.txHash ? (
          <p>
            <strong>txHash:</strong>{" "}
            <a
              href={`${explorerBaseUrl}/tx/${state.txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {state.txHash}
            </a>
          </p>
        ) : null}
        {state.proofId ? (
          <p>
            <strong>proofId:</strong> {state.proofId}
          </p>
        ) : null}
        {errors.general ? <p className="error">{errors.general}</p> : null}
        {errors.schema ? (
          <ul className="error-list">
            {errors.schema.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
