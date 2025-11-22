import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  ledgerWallet,
  metaMaskWallet,
  rainbowWallet,
  safeWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { rainbowkitBurnerWallet } from "burner-connector";
import * as chains from "viem/chains";
import scaffoldConfig from "~~/scaffold.config";

const { onlyLocalBurnerWallet, targetNetworks } = scaffoldConfig;

const wallets = [
  metaMaskWallet,
  walletConnectWallet,
  ledgerWallet,
  coinbaseWallet,
  rainbowWallet,
  safeWallet,
  ...(!targetNetworks.some(network => network.id !== (chains.hardhat as chains.Chain).id) || !onlyLocalBurnerWallet
    ? [rainbowkitBurnerWallet]
    : []),
];

// rainbowkitBurnerWallet comes from a package that may embed a different copy/version
// of rainbowkit/wagmi which causes a types mismatch at build-time. Cast to a
// compatible type to work around the duplicate-types issue while preserving runtime behavior.
// Use a broad 'any' cast here because the burner-connector package can bring a
// nested copy of rainbowkit/wagmi that makes the Wallet types incompatible at
// compile time. Casting to 'any' is a small, local workaround to keep runtime
// behavior while avoiding a build failure. A longer-term fix is to align
// dependency versions or add workspace resolutions so only one copy of
// rainbowkit/wagmi is installed.
const typedWallets = wallets as unknown as any[];

/**
 * wagmi connectors for the wagmi context
 */
export const wagmiConnectors = () => {
  // Only create connectors on client-side to avoid SSR issues
  // TODO: update when https://github.com/rainbow-me/rainbowkit/issues/2476 is resolved
  if (typeof window === "undefined") {
    return [];
  }

  return connectorsForWallets(
    [
      {
        groupName: "Supported Wallets",
          wallets: typedWallets,
      },
    ],

    {
      appName: "scaffold-eth-2",
      projectId: scaffoldConfig.walletConnectProjectId,
    },
  );
};
