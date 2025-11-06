"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, polygon, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const queryClient = new QueryClient();

const hardhatChain = {
  id: 31337,
  name: "Hardhat",
  network: "hardhat",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_HARDHAT_RPC_URL ?? "http://127.0.0.1:8545"],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_HARDHAT_RPC_URL ?? "http://127.0.0.1:8545"],
    },
  },
  blockExplorers: {
    default: {
      name: "Hardhat",
      url: "https://hardhat.network",
    },
  },
} as const;

const wagmiConfig = createConfig({
  chains: [hardhatChain, mainnet, polygon, sepolia],
  connectors: [
    injected({
      shimDisconnect: true,
      target: "metaMask",
    }),
  ],
  transports: {
    [hardhatChain.id]: http(process.env.NEXT_PUBLIC_HARDHAT_RPC_URL ?? "http://127.0.0.1:8545"),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [sepolia.id]: http(),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
