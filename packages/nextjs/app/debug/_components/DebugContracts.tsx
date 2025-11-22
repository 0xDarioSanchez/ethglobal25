"use client";

import { useEffect, useMemo } from "react";
import { useSessionStorage } from "usehooks-ts";
import { BarsArrowUpIcon } from "@heroicons/react/20/solid";
import { ContractUI } from "~~/app/debug/_components/contract";
import { ContractName, GenericContract } from "~~/utils/scaffold-eth/contract";
import { useAllContracts } from "~~/utils/scaffold-eth/contractsData";

const selectedContractStorageKey = "scaffoldEth2.selectedContract";

export function DebugContracts() {
  const contractsData = useAllContracts();
  const contractNames = useMemo(
    () => {
      // Optionally exclude some contracts from the UI
      const EXCLUDED_CONTRACTS = new Set<string>(["MockPYUSD","MockAavePool"]);
      return Object.keys(contractsData)
      .filter(name => !EXCLUDED_CONTRACTS.has(name))
      .sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      ) as ContractName[];
  }, [contractsData]);

  const [selectedContract, setSelectedContract] = useSessionStorage<ContractName>(
    selectedContractStorageKey,
    contractNames[0],
    { initializeWithValue: false },
  );


  useEffect(() => {
    if (!contractNames.includes(selectedContract)) {
      setSelectedContract(contractNames[0]);
    }
  }, [contractNames, selectedContract, setSelectedContract]);

    const getBlockscoutUrl = (contractName: string) => {
    if (contractName === "ProtocolContract") {
      return "https://lancer.cloud.blockscout.com/address/0xaf237a6455d1fa2987dbb03d340514f16b9f6789?tab=contract";
    } else if (contractName === "FactoryContract") {
      return "https://lancer.cloud.blockscout.com/address/0x8ddc8381e840f6f04309b044411430fa8be48a10?tab=contract";
    } else if (contractName.startsWith("MarketplaceInstance_")) {
      return "https://lancer.cloud.blockscout.com/address/0xae1fb4f4aa5f647a29300badc83fde2674491b72?tab=contract";
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-y-6 lg:gap-y-8 py-8 lg:py-12 justify-center items-center">
      {contractNames.length === 0 ? (
        <p className="text-3xl mt-14">No contracts found!</p>
      ) : (
        <>
          {contractNames.length > 1 && (
            <div className="flex flex-row gap-2 w-full max-w-7xl pb-1 px-6 lg:px-10 flex-wrap">
              {contractNames.map(contractName => {
                const displayLabel = contractName.startsWith("MarketplaceInstance_")
                  ? "Marketplace"
                  : contractName;
                const blockscoutUrl = getBlockscoutUrl(contractName);

                return (
                  <button
                    key={contractName}
                    className={`btn btn-secondary btn-sm font-light hover:border-transparent flex items-center gap-2 ${
                      contractName === selectedContract
                        ? "bg-base-300 hover:bg-base-300 no-animation"
                        : "bg-base-100 hover:bg-secondary"
                    }`}
                    onClick={() => setSelectedContract(contractName)}
                  >
                    <span>{displayLabel}</span>

                    {(contractsData[contractName] as GenericContract)?.external && (
                      <span
                        className="tooltip tooltip-top tooltip-accent"
                        data-tip="External contract"
                      >
                        <BarsArrowUpIcon className="h-4 w-4 cursor-pointer" />
                      </span>
                    )}

                    {blockscoutUrl && (
                      <a
                        href={blockscoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1"
                      >
                        <BarsArrowUpIcon className="h-4 w-4 cursor-pointer text-accent hover:text-primary" />
                      </a>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {contractNames.map(contractName => (
            <ContractUI
              key={contractName}
              contractName={contractName}
              className={contractName === selectedContract ? "" : "hidden"}
            />
          ))}
          {/* dev-only registry panel removed */}
        </>
      )}
    </div>
  );
}
