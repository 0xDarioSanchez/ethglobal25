"use client";
import { WagmiProvider, createConfig, http } from "wagmi";
import {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  scroll,
  avalanche,
  sophon,
  kaia,
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
} from "wagmi/chains";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NexusProvider from "./NexusProvider";
import { useEffect, useState } from "react";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const config = createConfig(
  getDefaultConfig({
    chains: [
      mainnet,
      base,
      polygon,
      arbitrum,
      optimism,
      scroll,
      avalanche,
      sophon,
      kaia,
      sepolia,
      baseSepolia,
      arbitrumSepolia,
      optimismSepolia,
      polygonAmoy,
    ],
    transports: {
      [mainnet.id]: http(mainnet.rpcUrls.default.http[0]),
      [arbitrum.id]: http(arbitrum.rpcUrls.default.http[0]),
      [base.id]: http(base.rpcUrls.default.http[0]),
      [optimism.id]: http(optimism.rpcUrls.default.http[0]),
      [polygon.id]: http(polygon.rpcUrls.default.http[0]),
      [avalanche.id]: http(avalanche.rpcUrls.default.http[0]),
      [scroll.id]: http(scroll.rpcUrls.default.http[0]),
      [sophon.id]: http(sophon.rpcUrls.default.http[0]),
      [kaia.id]: http(kaia.rpcUrls.default.http[0]),
      [sepolia.id]: http(sepolia.rpcUrls.default.http[0]),
      [baseSepolia.id]: http(baseSepolia.rpcUrls.default.http[0]),
      [arbitrumSepolia.id]: http(arbitrumSepolia.rpcUrls.default.http[0]),
      [optimismSepolia.id]: http(optimismSepolia.rpcUrls.default.http[0]),
      [polygonAmoy.id]: http(polygonAmoy.rpcUrls.default.http[0]),
    },

    walletConnectProjectId: walletConnectProjectId!,

    // Required App Info
    appName: "Avail Nexus",

    // Optional App Info
    appDescription: "Avail Nexus",
    appUrl: "https://www.availproject.org/",
    appIcon:
      "https://www.availproject.org/_next/static/media/avail_logo.9c818c5a.png",
  }),
);
const queryClient = new QueryClient();

const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="soft" mode="light">
          {/* Only mount NexusProvider after the client has mounted to avoid React's 
              "update a component while rendering a different component (Hydrate)"
              warning during server hydration,  */}
          <DevClientErrorListener />
          <ClientOnly>
            <NexusProvider>{children}</NexusProvider>
          </ClientOnly>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return <>{children}</>;
};

const DevClientErrorListener = () => {
  useEffect(() => {
    const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
      try {
        console.error("Unhandled promise rejection:", ev.reason);
        if (ev.reason && typeof ev.reason === "object") {
          const msg = (ev.reason as any).message || JSON.stringify(ev.reason);
          if (/failed to fetch/i.test(String(msg))) {
            console.error("Network fetch failed. Check local services (envio, Hasura) and verify endpoints are reachable.");
          }
        }
      } catch (e) {
        console.error("Error in unhandled rejection handler", e);
      }
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }, []);

  return null;
};

export default Web3Provider;
