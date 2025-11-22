"use client";

import { useEffect, useMemo, useState } from "react";
import { InheritanceTooltip } from "./InheritanceTooltip";
import { Abi, AbiFunction } from "abitype";
import { Address, TransactionReceipt, decodeEventLog, getEventSelector } from "viem";
import { useAccount, useConfig, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  ContractInput,
  TxReceipt,
  getFunctionInputKey,
  getInitialFormState,
  getParsedContractFunctionArgs,
  transformAbiFunction,
} from "~~/app/debug/_components/contract";
import MarketplaceInstanceJson from "~~/../foundry/out/MarketplaceInstance.sol/MarketplaceInstance.json";
import FactoryContractJson from "~~/../foundry/out/FactoryContract.sol/FactoryContract.json";
import { IntegerInput } from "~~/components/scaffold-eth";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { AllowedChainIds } from "~~/utils/scaffold-eth";
import { simulateContractWriteAndNotifyError } from "~~/utils/scaffold-eth/contract";

type WriteOnlyFunctionFormProps = {
  abi: Abi;
  abiFunction: AbiFunction;
  onChange: () => void;
  contractAddress: Address;
  inheritedFrom?: string;
};

export const WriteOnlyFunctionForm = ({
  abi,
  abiFunction,
  onChange,
  contractAddress,
  inheritedFrom,
}: WriteOnlyFunctionFormProps) => {
  const [form, setForm] = useState<Record<string, any>>(() => getInitialFormState(abiFunction));
  const [txValue, setTxValue] = useState<string>("");
  const { chain } = useAccount();
  const writeTxn = useTransactor();
  const { targetNetwork } = useTargetNetwork();
  const writeDisabled = !chain || chain?.id !== targetNetwork.id;

  const { data: result, isPending, writeContractAsync } = useWriteContract();

  const wagmiConfig = useConfig();

  const handleWrite = async () => {
    if (writeContractAsync) {
      try {
        const writeContractObj = {
          address: contractAddress,
          functionName: abiFunction.name,
          abi: abi,
          args: getParsedContractFunctionArgs(form),
          value: BigInt(txValue),
        };
        await simulateContractWriteAndNotifyError({
          wagmiConfig,
          writeContractParams: writeContractObj,
          chainId: targetNetwork.id as AllowedChainIds,
        });

        const makeWriteWithParams = () => writeContractAsync(writeContractObj);
        await writeTxn(makeWriteWithParams);
        onChange();
      } catch (e: any) {
        console.error("⚡️ ~ file: WriteOnlyFunctionForm.tsx:handleWrite ~ error", e);
      }
    }
  };

  const [displayedTxResult, setDisplayedTxResult] = useState<TransactionReceipt>();
  const { data: txResult } = useWaitForTransactionReceipt({
    hash: result,
  });
  useEffect(() => {
    setDisplayedTxResult(txResult);
  }, [txResult]);

  // When a txReceipt arrives, inspect logs to see if a MarketplaceInstance was deployed
  useEffect(() => {
    if (!txResult) return;

    try {
      const factoryAbi = abi as any[];

      for (const log of (txResult.logs || [])) {
        try {
          // debug: log the raw topics/data so we can inspect what's on the receipt
          console.debug("tx log topics/data", { topics: log.topics, data: log.data });
          // Try decoding using each event entry individually to be more robust
          const eventAbis = (factoryAbi || []).filter((e: any) => e.type === "event");
          let decoded: any = null;
          let matchedEventAbi: any = null;
          for (const eventAbi of eventAbis) {
            try {
              // compute selector for quick match
              const selector = getEventSelector(eventAbi as any);
              if (log.topics && log.topics[0] && selector && log.topics[0].toLowerCase() !== selector.toLowerCase()) {
                // not this event
                continue;
              }
              decoded = decodeEventLog({ abi: eventAbi as any, data: log.data, topics: log.topics });
              matchedEventAbi = eventAbi;
              if (decoded?.eventName) break;
            } catch (e) {
              // ignore decode errors per event
            }
          }

          // If we didn't get decoded args, try to detect the MarketplaceDeployed by name and fall back to topics
          if (!decoded) {
            // First try the ABI that was passed to this form (commonly the factory ABI)
            if (eventAbis.length > 0) {
              const marketplaceEvent = eventAbis.find((e: any) => e.name === "MarketplaceDeployed");
              if (marketplaceEvent) {
                const selector = getEventSelector(marketplaceEvent as any);
                console.log("Marketplace fallback: checking selector from current ABI", { selector, topic0: log.topics?.[0] });
                if (log.topics && log.topics[0] && selector && log.topics[0].toLowerCase() === selector.toLowerCase()) {
                  // marketplace address is indexed at topics[1]
                  const topicAddr = log.topics[1];
                  if (topicAddr && typeof topicAddr === "string") {
                    const addr = `0x${topicAddr.slice(-40)}`;
                    decoded = { eventName: "MarketplaceDeployed", args: { marketplace: addr } };
                    matchedEventAbi = marketplaceEvent;
                  }
                }
              }
            }

            // If still not found, try the known FactoryContract ABI as a last resort. This helps when the
            // current form ABI doesn't include the factory event (e.g. proxied contracts or different ABI shape).
            if (!decoded) {
              try {
                const factoryEvent = (FactoryContractJson.abi || []).find((e: any) => e.type === "event" && e.name === "MarketplaceDeployed");
                if (factoryEvent) {
                  const factorySelector = getEventSelector(factoryEvent as any);
                  console.log("Marketplace fallback: checking selector from FactoryContract ABI", { factorySelector, topic0: log.topics?.[0] });
                  if (log.topics && log.topics[0] && factorySelector && log.topics[0].toLowerCase() === factorySelector.toLowerCase()) {
                    const topicAddr = log.topics[1];
                    if (topicAddr && typeof topicAddr === "string") {
                      const addr = `0x${topicAddr.slice(-40)}`;
                      decoded = { eventName: "MarketplaceDeployed", args: { marketplace: addr } };
                      matchedEventAbi = factoryEvent;
                    }
                  }
                }
              } catch (e) {
                console.log("Marketplace fallback: factory ABI check failed", e);
              }
            }

            // Final catch-all: compute selector from canonical signature string
            if (!decoded) {
              try {
                const canonical = getEventSelector({ name: "MarketplaceDeployed", type: "event", inputs: [ { type: "address", indexed: true }, { type: "address", indexed: true } ] } as any);
                console.log("Marketplace fallback: canonical selector", { canonical, topic0: log.topics?.[0] });
                if (log.topics && log.topics[0] && canonical && log.topics[0].toLowerCase() === canonical.toLowerCase()) {
                  const topicAddr = log.topics[1];
                  if (topicAddr && typeof topicAddr === "string") {
                    const addr = `0x${topicAddr.slice(-40)}`;
                    decoded = { eventName: "MarketplaceDeployed", args: { marketplace: addr } };
                  }
                }
              } catch (e) {
                console.log("Marketplace fallback: canonical selector check failed", e);
              }
            }
          }

          if (decoded && decoded.eventName === "MarketplaceDeployed") {
            const marketplaceAddress = decoded.args?.marketplace ?? (decoded.args && decoded.args[0]) ?? null;
            if (marketplaceAddress) {
              const DYNAMIC_KEY = "scaffoldEth2.dynamicContracts";
              // normalize chain id to decimal string (handle hex like 0x7a69)
              const rawChainId = (txResult as any).chainId ?? (window as any).ethereum?.chainId ?? targetNetwork?.id ?? 31337;
              const normalizedChainId = typeof rawChainId === "string" && rawChainId.startsWith("0x")
                ? String(parseInt(rawChainId, 16))
                : String(Number(rawChainId) || targetNetwork?.id || 31337);
              const chainId = normalizedChainId;
              const currentRaw = sessionStorage.getItem(DYNAMIC_KEY);
              const parsed = currentRaw ? JSON.parse(currentRaw) : {};
              parsed[chainId] = parsed[chainId] || {};

              const generatedName = `MarketplaceInstance_${String(marketplaceAddress).slice(2, 8)}`;
              parsed[chainId][generatedName] = {
                address: marketplaceAddress,
                abi: MarketplaceInstanceJson.abi,
                deployedOnBlock: txResult.blockNumber,
              };
              sessionStorage.setItem(DYNAMIC_KEY, JSON.stringify(parsed));
              console.log("Registered dynamic contract", { generatedName, marketplaceAddress, chainId });
              window.dispatchEvent(new Event("scaffoldEth2:dynamicContractsUpdated"));
            }
          }
        } catch (e) {
          // ignore per-log decode errors
        }
      }
    } catch (e) {
      console.error("Failed to process tx logs for dynamic contract registration", e);
    }
  }, [txResult, abi]);

  const transformedFunction = useMemo(() => transformAbiFunction(abiFunction), [abiFunction]);
  const inputs = transformedFunction.inputs.map((input, inputIndex) => {
    const key = getFunctionInputKey(abiFunction.name, input, inputIndex);
    return (
      <ContractInput
        key={key}
        setForm={updatedFormValue => {
          setDisplayedTxResult(undefined);
          setForm(updatedFormValue);
        }}
        form={form}
        stateObjectKey={key}
        paramType={input}
      />
    );
  });
  const zeroInputs = inputs.length === 0 && abiFunction.stateMutability !== "payable";

  return (
    <div className="py-5 space-y-3 first:pt-0 last:pb-1">
      <div className={`flex gap-3 ${zeroInputs ? "flex-row justify-between items-center" : "flex-col"}`}>
        <p className="font-medium my-0 break-words">
          {abiFunction.name}
          <InheritanceTooltip inheritedFrom={inheritedFrom} />
        </p>
        {inputs}
        {abiFunction.stateMutability === "payable" ? (
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center ml-2">
              <span className="text-xs font-medium mr-2 leading-none">payable value</span>
              <span className="block text-xs font-extralight leading-none">wei</span>
            </div>
            <IntegerInput
              value={txValue}
              onChange={updatedTxValue => {
                setDisplayedTxResult(undefined);
                setTxValue(updatedTxValue);
              }}
              placeholder="value (wei)"
            />
          </div>
        ) : null}
        <div className="flex justify-between gap-2">
          {!zeroInputs && (
            <div className="grow basis-0">{displayedTxResult ? <TxReceipt txResult={displayedTxResult} /> : null}</div>
          )}
          <div
            className={`flex ${
              writeDisabled &&
              "tooltip tooltip-bottom tooltip-secondary before:content-[attr(data-tip)] before:-translate-x-1/3 before:left-auto before:transform-none"
            }`}
            data-tip={`${writeDisabled && "Wallet not connected or in the wrong network"}`}
          >
            <button className="btn btn-secondary btn-sm" disabled={writeDisabled || isPending} onClick={handleWrite}>
              {isPending && <span className="loading loading-spinner loading-xs"></span>}
              Send 💸
            </button>
          </div>
        </div>
      </div>
      {zeroInputs && txResult ? (
        <div className="grow basis-0">
          <TxReceipt txResult={txResult} />
        </div>
      ) : null}
    </div>
  );
};
