import { useEffect, useState } from "react";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { GenericContractsDeclaration, contracts } from "~~/utils/scaffold-eth/contract";

const DEFAULT_ALL_CONTRACTS: GenericContractsDeclaration[number] = {};

const DYNAMIC_CONTRACTS_STORAGE_KEY = "scaffoldEth2.dynamicContracts";

function readDynamicContracts(): Partial<Record<string, Record<string, any>>> {
  try {
    const raw = sessionStorage.getItem(DYNAMIC_CONTRACTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse dynamic contracts from sessionStorage", e);
    return {};
  }
}

export function useAllContracts() {
  const { targetNetwork } = useTargetNetwork();
  const [dynamicContracts, setDynamicContracts] = useState<Partial<Record<string, Record<string, any>>>>(() => {
    if (typeof window === "undefined") return {};
    return readDynamicContracts();
  });

  useEffect(() => {
    const handler = () => setDynamicContracts(readDynamicContracts());
    // custom event dispatched when we update dynamic contracts
    window.addEventListener("scaffoldEth2:dynamicContractsUpdated", handler);
    // also listen to storage events (other tabs)
    window.addEventListener("storage", handler as any);
    return () => {
      window.removeEventListener("scaffoldEth2:dynamicContractsUpdated", handler);
      window.removeEventListener("storage", handler as any);
    };
  }, []);

  const contractsData = contracts?.[targetNetwork.id] || DEFAULT_ALL_CONTRACTS;
  const dynamicForChain = dynamicContracts?.[String(targetNetwork.id)] || {};

  // merge dynamic contracts into deployed contracts (dynamic wins)
  return { ...contractsData, ...dynamicForChain } as GenericContractsDeclaration[number];
}
