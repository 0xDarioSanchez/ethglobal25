"use client";

import { TransactionReceipt, getEventSelector } from "viem";
import { CheckCircleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { ObjectFieldDisplay } from "~~/app/debug/_components/contract";
import { useCopyToClipboard } from "~~/hooks/scaffold-eth/useCopyToClipboard";
import { replacer } from "~~/utils/scaffold-eth/common";
import MarketplaceInstanceJson from "~~/../foundry/out/MarketplaceInstance.sol/MarketplaceInstance.json";

export const TxReceipt = ({ txResult }: { txResult: TransactionReceipt }) => {
  const { copyToClipboard: copyTxResultToClipboard, isCopiedToClipboard: isTxResultCopiedToClipboard } =
    useCopyToClipboard();

  // Attempt to extract a MarketplaceDeployed address from the tx receipt logs
  const findMarketplaceAddress = (): string | null => {
    try {
      if (!txResult || !Array.isArray(txResult.logs)) return null;
      // compute canonical selector for MarketplaceDeployed(address,address)
      const selector = getEventSelector({
        type: "event",
        name: "MarketplaceDeployed",
        inputs: [
          { type: "address", indexed: true },
          { type: "address", indexed: true },
        ],
      } as any);
      for (const l of txResult.logs as any[]) {
        if (l?.topics && l.topics[0] && selector && l.topics[0].toLowerCase() === selector.toLowerCase()) {
          const topicAddr = l.topics[1];
          if (topicAddr && typeof topicAddr === "string") return `0x${topicAddr.slice(-40)}`;
        }
      }
      return null;
    } catch (e) {
      console.log("findMarketplaceAddress error", e);
      return null;
    }
  };

  const registerMarketplaceFromReceipt = () => {
    try {
      const addr = findMarketplaceAddress();
      if (!addr) {
        console.log("No MarketplaceDeployed event found in receipt logs");
        alert("No MarketplaceDeployed event found in receipt logs");
        return;
      }
      const DYNAMIC_KEY = "scaffoldEth2.dynamicContracts";
      const rawChainId = (txResult as any).chainId ?? (window as any).ethereum?.chainId ?? 31337;
      const normalizedChainId = typeof rawChainId === "string" && rawChainId.startsWith("0x")
        ? String(parseInt(rawChainId, 16))
        : String(Number(rawChainId) || 31337);
      const chainId = normalizedChainId;
      const currentRaw = sessionStorage.getItem(DYNAMIC_KEY);
      const parsed = currentRaw ? JSON.parse(currentRaw) : {};
      parsed[chainId] = parsed[chainId] || {};
      const generatedName = `MarketplaceInstance_${String(addr).slice(2, 8)}`;
      parsed[chainId][generatedName] = {
        address: addr,
        abi: MarketplaceInstanceJson.abi,
        // ensure deployedOnBlock is a safe serializable number
        deployedOnBlock: typeof (txResult as any).blockNumber === "bigint"
          ? Number((txResult as any).blockNumber)
          : Number((txResult as any).blockNumber) || (txResult as any).blockNumber,
      };
      // Use the project's replacer to safely serialize BigInt if present
      sessionStorage.setItem(DYNAMIC_KEY, JSON.stringify(parsed, replacer));
      window.dispatchEvent(new Event("scaffoldEth2:dynamicContractsUpdated"));
      console.log("Registered dynamic contract from TxReceipt", { generatedName, addr, chainId });
      alert(`Registered dynamic contract ${generatedName}`);
    } catch (e) {
      console.error("Failed to register marketplace from receipt", e);
      alert("Failed to register marketplace from receipt (see console)");
    }
  };

  return (
    <div className="flex text-sm rounded-3xl peer-checked:rounded-b-none min-h-0 bg-secondary py-0">
      <div className="mt-1 pl-2 flex items-center gap-2">
        {isTxResultCopiedToClipboard ? (
          <CheckCircleIcon
            className="ml-1.5 text-xl font-normal text-base-content h-5 w-5 cursor-pointer"
            aria-hidden="true"
          />
        ) : (
          <DocumentDuplicateIcon
            className="ml-1.5 text-xl font-normal h-5 w-5 cursor-pointer"
            aria-hidden="true"
            onClick={() => copyTxResultToClipboard(JSON.stringify(txResult, replacer, 2))}
          />
        )}
        {/* Dev helper: register a newly-deployed marketplace into the Debug UI dynamic registry */}
        <button
          className="btn btn-ghost btn-xs"
          onClick={registerMarketplaceFromReceipt}
          title="Register marketplace from this tx receipt into Debug UI (dev only)"
        >
          Register
        </button>
      </div>
      <div tabIndex={0} className="flex-wrap collapse collapse-arrow">
        <input type="checkbox" className="min-h-0! peer" />
        <div className="collapse-title text-sm min-h-0! py-1.5 pl-1 after:top-4!">
          <strong>Transaction Receipt</strong>
        </div>
        <div className="collapse-content overflow-auto bg-secondary rounded-t-none rounded-3xl pl-0!">
          <pre className="text-xs">
            {Object.entries(txResult).map(([k, v]) => (
              <ObjectFieldDisplay name={k} value={v} size="xs" leftPad={false} key={k} />
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
};
