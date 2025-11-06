"use client";

import { useState } from "react";
import { usePublicClient } from "wagmi";
import { getBytes, verifyMessage } from "ethers";
import { computeDatasetDigest, DatasetMeta, openDataRegistryAbi, OPEN_DATA_REGISTRY_ADDRESS } from "../lib/contracts";
import { keccakFileChunked, computeMetadataHash } from "../lib/hash";

interface VerificationResult {
  contentMatch: boolean;
  metadataMatch: boolean;
  signerMatch: boolean;
  publisher: `0x${string}`;
  signer?: string;
  expectedContentHash: `0x${string}`;
  computedContentHash: `0x${string}`;
  expectedMetadataHash: `0x${string}`;
  computedMetadataHash: `0x${string}`;
}

export function VerifyTool() {
  const publicClient = usePublicClient();
  const [proofId, setProofId] = useState("" as `0x${string}` | "");
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [metadataJson, setMetadataJson] = useState("{}");
  const [signature, setSignature] = useState("" as `0x${string}` | "");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const allPassed = result ? result.contentMatch && result.metadataMatch && result.signerMatch : false;

  const handleVerify = async () => {
    if (!publicClient) {
      setErrorMessage("RPC client unavailable in browser");
      return;
    }
    if (!OPEN_DATA_REGISTRY_ADDRESS) {
      setErrorMessage("Missing NEXT_PUBLIC_OPEN_DATA_REGISTRY env variable.");
      return;
    }
    if (!proofId) {
      setErrorMessage("Enter a proofId to verify.");
      return;
    }
    if (!datasetFile) {
      setErrorMessage("Select the dataset file used during publication.");
      return;
    }
    if (!signature) {
      setErrorMessage("Provide the publisher's signature from the publish step.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setStatusMessage("Fetching proof & recomputing hashes...");

    try {
      const registryAddress = OPEN_DATA_REGISTRY_ADDRESS;
      const proof = await publicClient.readContract({
        address: registryAddress,
        abi: openDataRegistryAbi,
        functionName: "getProof",
        args: [proofId],
      });

      const [contentHash, metadataHash, publisher, , uri, version, stationId] = proof as [
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        bigint,
        string,
        string,
        string,
        number
      ];

      const computedContentHash = await keccakFileChunked(datasetFile);

      let parsedMetadata: Record<string, unknown>;
      try {
        parsedMetadata = JSON.parse(metadataJson);
      } catch (err) {
        throw new Error("Metadata JSON is invalid");
      }

      const computedMetadataHash = computeMetadataHash(parsedMetadata);

      const datasetMeta: DatasetMeta = {
        stationId: String(parsedMetadata.stationId ?? stationId ?? ""),
        capturedAt: BigInt(Number(parsedMetadata.capturedAt ?? 0)),
        format: (parsedMetadata.format as DatasetMeta["format"]) ?? "csv",
        schemaUri: String(parsedMetadata.schemaUri ?? ""),
        license: String(parsedMetadata.license ?? ""),
        publisherDid: typeof parsedMetadata.publisherDid === "string" ? parsedMetadata.publisherDid : "",
        contentHash: parsedMetadata.contentHash ? (parsedMetadata.contentHash as `0x${string}`) : computedContentHash,
      };

      if (!datasetMeta.stationId || !datasetMeta.schemaUri || !datasetMeta.license) {
        throw new Error("Metadata document missing required fields (stationId, schemaUri, license).");
      }

      const digest = computeDatasetDigest({
        contentHash,
        metadataHash,
        uri,
        version,
        stationId,
        publisher,
        registry: registryAddress,
      });
      const signer = verifyMessage(getBytes(digest), signature);

      const verificationResult: VerificationResult = {
        contentMatch: computedContentHash.toLowerCase() === contentHash.toLowerCase(),
        metadataMatch: computedMetadataHash.toLowerCase() === metadataHash.toLowerCase(),
        signerMatch: signer.toLowerCase() === publisher.toLowerCase(),
        publisher,
        signer,
        expectedContentHash: contentHash,
        computedContentHash,
        expectedMetadataHash: metadataHash,
        computedMetadataHash,
      };

      setResult(verificationResult);

      if (verificationResult.contentMatch && verificationResult.metadataMatch && verificationResult.signerMatch) {
        setStatusMessage("Verification successful — all hashes and signature match the on-chain proof.");
      } else {
        setStatusMessage("Verification failed — see highlighted mismatches below.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Verification failed");
      setResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <section className="card">
      <header className="card-header">
        <h2>4. Local Verification (WASM)</h2>
      </header>
      <div className="form-grid">
        <label className="form-field">
          <span>Proof ID</span>
          <input type="text" value={proofId} onChange={(event) => setProofId(event.target.value as `0x${string}`)} />
        </label>
        <label className="form-field">
          <span>Dataset File</span>
          <input type="file" accept=".csv,.json" onChange={(event) => setDatasetFile(event.target.files?.[0] ?? null)} />
        </label>
        <label className="form-textarea">
          <span>Metadata JSON</span>
          <textarea rows={6} value={metadataJson} onChange={(event) => setMetadataJson(event.target.value)} />
          <p className="hint">Tip: copy this from the publish card’s “View metadata JSON” panel.</p>
        </label>
        <label className="form-field">
          <span>Publisher Signature (eth_sign digest)</span>
          <input type="text" value={signature} onChange={(event) => setSignature(event.target.value as `0x${string}`)} />
          <p className="hint">Use the signature shown in the publish card (publisherSignature) right after signing.</p>
        </label>
        <div className="form-actions">
          <button type="button" className="primary" onClick={handleVerify} disabled={isVerifying}>
            {isVerifying ? "Verifying..." : "Verify"}
          </button>
        </div>
      </div>
      <div className="form-feedback">
        {statusMessage ? <span className={allPassed ? "status" : "error"}>{statusMessage}</span> : null}
        {errorMessage ? <span className="error">{errorMessage}</span> : null}
        {result ? (
          <div className="verification-summary">
            <p>
              Content Hash Match: <strong>{result.contentMatch ? "✅" : "❌"}</strong>
              {!result.contentMatch ? (
                <span className="hint">
                  Expected {result.expectedContentHash}, computed {result.computedContentHash}
                </span>
              ) : null}
            </p>
            <p>
              Metadata Hash Match: <strong>{result.metadataMatch ? "✅" : "❌"}</strong>
              {!result.metadataMatch ? (
                <span className="hint">
                  Expected {result.expectedMetadataHash}, computed {result.computedMetadataHash}
                </span>
              ) : null}
            </p>
            <p>
              Signature signer: <span className="mono">{result.signer ?? "Unknown"}</span>
              <br />
              Matches publisher ({result.publisher}): <strong>{result.signerMatch ? "✅" : "❌"}</strong>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
