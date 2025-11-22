"use client";

import { useEffect } from "react";
import { InheritanceTooltip } from "./InheritanceTooltip";
import { displayTxResult } from "./utilsDisplay";
import { Abi, AbiFunction } from "abitype";
import { Address } from "viem";
import { useReadContract } from "wagmi";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAnimationConfig } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

type DisplayVariableProps = {
  contractAddress: Address;
  abiFunction: AbiFunction;
  refreshDisplayVariables: boolean;
  inheritedFrom?: string;
  abi: Abi;
};

export const DisplayVariable = ({
  contractAddress,
  abiFunction,
  refreshDisplayVariables,
  abi,
  inheritedFrom,
}: DisplayVariableProps) => {
  const { targetNetwork } = useTargetNetwork();

  const {
    data: result,
    isFetching,
    refetch,
    error,
  } = useReadContract({
    address: contractAddress,
    functionName: abiFunction.name,
    abi: abi,
    chainId: targetNetwork.id,
    query: {
      retry: false,
    },
  });

  const { showAnimation } = useAnimationConfig(result);

  // Format numeric function names that represent token amounts with 6 decimals (e.g. "50000000" -> "50 PYUSD")
  const formatAbiName = (name: string) => {
    if (!/^[0-9]+$/.test(name)) return name;

    // Consider the last 6 digits as decimals (token has 6 decimals)
    const decimals = 6;
    const raw = name.replace(/^0+/, "") || "0";

    // If the value is smaller than 10^6, show fractional value
    const padded = raw.padStart(decimals + 1, "0");
    const intPart = padded.slice(0, -decimals);
    let fracPart = padded.slice(-decimals);

    fracPart = fracPart.replace(/0+$/, "");

    const integerNormalized = String(BigInt(intPart || "0"));

    const formatted = fracPart ? `${integerNormalized}.${fracPart}` : integerNormalized;
    return `${formatted} PYUSD`;
  };

  useEffect(() => {
    refetch();
  }, [refetch, refreshDisplayVariables]);

  useEffect(() => {
    if (error) {
      const parsedError = getParsedError(error);
      notification.error(parsedError);
    }
  }, [error]);

  return (
    <div className="space-y-1 pb-2">
      <div className="flex items-center">
  <h3 className="font-medium text-lg mb-0 break-all">{formatAbiName(String(abiFunction.name))}</h3>
        <button className="btn btn-ghost btn-xs" onClick={async () => await refetch()}>
          {isFetching ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <ArrowPathIcon className="h-3 w-3 cursor-pointer" aria-hidden="true" />
          )}
        </button>
        <InheritanceTooltip inheritedFrom={inheritedFrom} />
      </div>
      <div className="text-base-content/80 flex flex-col items-start">
        <div>
          <div
            className={`break-all block transition bg-transparent ${
              showAnimation ? "bg-warning rounded-xs animate-pulse-fast" : ""
            }`}
          >
            {(() => {
              // Format primitive numeric results for token-like functions (e.g., disputePrice)
              const fnName = String(abiFunction.name).toLowerCase();

              // Only format the specific on-chain token amount `disputePrice` to human-readable PYUSD.
              // Avoid formatting other numeric values like `feePercent` which represent percentages.
              const shouldFormatToken = fnName === "disputeprice";

              const formatTokenValue = (val: any) => {
                if (val == null) return val;
                // accept bigint, number, or numeric string
                let numericStr: string | null = null;
                if (typeof val === "bigint") numericStr = val.toString();
                else if (typeof val === "number" && Number.isFinite(val)) numericStr = String(Math.trunc(val));
                else if (typeof val === "string" && /^[0-9]+$/.test(val)) numericStr = val;
                if (!numericStr) return val;

                try {
                  const decimals = 6;
                  const denom = BigInt(10 ** decimals);
                  const big = BigInt(numericStr);
                  const intPart = big / denom;
                  const rem = big % denom;
                  let frac = rem.toString().padStart(decimals, "0");
                  frac = frac.replace(/0+$/, "");
                  const formatted = frac ? `${intPart.toString()}.${frac}` : intPart.toString();
                  return `${formatted} PYUSD`;
                } catch (e) {
                  return val;
                }
              };

              const displayValue = shouldFormatToken ? formatTokenValue(result) : result;
              return displayTxResult(displayValue);
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
