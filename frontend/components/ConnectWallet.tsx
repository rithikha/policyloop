"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function truncateAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ConnectWallet() {
  const { address, isConnecting } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [error, setError] = useState<string | null>(null);
  const targetChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111");

  const handleConnect = async () => {
    setError(null);
    try {
      const connector = connectors?.[0];
      if (!connector) {
        throw new Error("No injected wallet available. Install MetaMask or another EIP-1193 wallet.");
      }
      await connectAsync({ connector, chainId: targetChainId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

  if (address) {
    return (
      <div className="connect-wallet">
        <span className="address">{truncateAddress(address)}</span>
        <button type="button" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="connect-wallet">
      <button type="button" onClick={handleConnect} disabled={isConnecting || isPending}>
        {isConnecting || isPending ? "Connecting..." : "Connect Wallet"}
      </button>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
