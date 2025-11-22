"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BoltIcon } from "@heroicons/react/24/outline";
import {
  EntityInfo,
  getEventCounts,
  getRecentEvents,
  getSchemaEntities,
  getMarketplaceDeployments,
} from "~~/utils/graphql";
import { getEventSelector, decodeEventLog } from "viem";
import { usePublicClient, useAccount } from "wagmi";

// Helper function to convert contract names to user-friendly display names
const getFriendlyName = (eventType: string): string => {
  return eventType
    .replace(/MockPYUSD/g, "PYUSD")
    .replace(/MockAavePool/g, "Aave Pool")
    .replace(/ProtocolContract/g, "Protocol")
    .replace(/FactoryContract/g, "Factory")
    .replace(/MarketplaceInstance/g, "Marketplace")
    .replace(/_/g, " ");
};

/**
 * Envio Indexer Page
 * This page will display indexed data from the Envio indexer
 */
const EnvioPage = () => {
  const [indexerStatus, setIndexerStatus] = useState<"checking" | "active" | "inactive">("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [eventCounts, setEventCounts] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [schemaEntities, setSchemaEntities] = useState<EntityInfo[]>([]);
  const [marketplaces, setMarketplaces] = useState<Array<{ id: string; marketplace: string; creator: string }>>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [isScanningUsers, setIsScanningUsers] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [isScanningDeals, setIsScanningDeals] = useState(false);
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();

  // Check indexer status by checking the console/state endpoint
  const checkIndexerStatus = async () => {
    console.log("🔍 Checking Envio indexer status...");
    try {
      // Check the console/state endpoint - this returns 200 when indexer is running
      // Using no-cors mode to bypass CORS restrictions
      const url = "http://localhost:9898/console/state";
      console.log("📡 Making request to", url);

      // Try a short timeout ping to the indexer. We prefer a simple fetch and rely on
      // network errors to indicate the service is down. Using `no-cors` yields an
      // opaque response which can't be inspected, but a network failure will still
      // throw and be caught below.
      let response: Response;
      try {
        response = await fetch(url, {
          method: "GET",
          mode: "no-cors",
          signal: AbortSignal.timeout(2000),
        } as RequestInit);
      } catch (err) {
        // Network-level failure (connection refused, DNS failure, CORS preflight failure, etc.)
        console.error(`Failed to reach Envio indexer at ${url}. Is the indexer running?`);
        console.error("Fetch error:", err);
        setIndexerStatus("inactive");
        setLastChecked(new Date());
        return;
      }

      // If fetch doesn't throw, we treat the endpoint as reachable. In no-cors mode the
      // response will be opaque (type === 'opaque') and status is typically 0; still,
      // successful network-level completion means the service responded.
      console.log("📊 Response type:", response.type);
      console.log("✅ Indexer is ACTIVE - endpoint reachable");
      setIndexerStatus("active");
    } catch (error) {
      // Fallback catch - log with context
      console.error("❌ Indexer status check failed:", error);
      console.error("Hint: start the indexer with 'pnpm dev' in packages/envio and ensure ports 8080/9898 are available.");
      setIndexerStatus("inactive");
    }
    setLastChecked(new Date());
  };

  // Fetch events from the indexer
  const fetchEvents = useCallback(async () => {
    if (indexerStatus !== "active") return;

    setIsLoadingEvents(true);
    try {
      console.log("📊 Fetching events from indexer...");

      // First get the schema entities
      const entities = await getSchemaEntities();
      setSchemaEntities(entities);
      console.log("📊 Schema entities loaded:", entities);

      if (entities.length === 0) {
        console.warn("No entities found in schema");
        return;
      }

  // Increase recent events limit so we try to read older entries that may not appear
  // in a very short recent window. This helps when some entities are indexed earlier
  // and others later by the indexer.
  const [counts, events] = await Promise.all([getEventCounts(), getRecentEvents(200)]);

      // Also fetch marketplace deployments from Envio specifically
      let mps: Array<{ id: string; marketplace: string; creator: string }> = [];
      try {
        mps = await getMarketplaceDeployments();
        setMarketplaces(mps);
        console.log("📊 Marketplaces loaded:", mps);
      } catch (err) {
        console.error("❌ Failed to load marketplaces:", err);
        setMarketplaces([]);
        mps = [];
      }

      setEventCounts(counts);
      setRecentEvents(events);
      // Try to detect a registered-user entity in the fetched events/schema
      let usersFromEnvio: any[] = [];
      try {
        const userEntityName = Object.keys(events || {}).find(name => /userregistered|registereduser|user_registered|user/i.test(name));
        if (userEntityName) {
          usersFromEnvio = events[userEntityName] || [];
          setRegisteredUsers(usersFromEnvio as any[]);
          console.log("📊 Registered users loaded from entity:", userEntityName, usersFromEnvio);
        } else {
          setRegisteredUsers([]);
          console.log("ℹ️ No user-related entity found in Envio schema/events");
        }
      } catch (err) {
        console.error("❌ Failed to extract registered users:", err);
        setRegisteredUsers([]);
        usersFromEnvio = [];
      }

      // If Envio didn't provide registered users, fall back to on-chain log scan
      try {
        if ((usersFromEnvio?.length ?? 0) === 0 && (mps?.length ?? 0) > 0) {
          // kick off on-chain scan (don't await here to avoid delaying UI)
          scanRegisteredUsersOnChain(mps).catch(e => console.error("On-chain scan failed:", e));
        }
      } catch (err) {
        console.error("❌ fallback on-chain scan failed:", err);
      }

      // If Envio didn't provide deals, fall back to on-chain log scan for DealCreated
      try {
        const dealsEntityName = Object.keys(events || {}).find(name => /dealcreated|deal_created|deal/i.test(name));
        const dealsFromEnvio = dealsEntityName ? events[dealsEntityName] || [] : [];
        if ((dealsFromEnvio?.length ?? 0) > 0) {
          setDeals(dealsFromEnvio);
        } else if ((mps?.length ?? 0) > 0) {
          scanDealsOnChain(mps).catch(e => console.error("On-chain deals scan failed:", e));
        }
      } catch (err) {
        console.error("❌ fallback on-chain deals scan failed:", err);
      }
      console.log("📊 Events loaded:", { counts, events });
    } catch (error) {
      console.error("❌ Error fetching events:", error);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [indexerStatus]);

  // Scan the blockchain for UserRegistered events for known marketplaces (on-chain fallback)
  const scanRegisteredUsersOnChain = async (mpsParam?: Array<{ id: string; marketplace: string; creator: string }>) => {
    const mpsToScan = mpsParam ?? marketplaces ?? [];
    console.log("🔎 scanRegisteredUsersOnChain called. publicClient:", !!publicClient, "marketplacesCount:", mpsToScan.length);
    if (!publicClient) {
      // Try a few short retries for publicClient (it may be initialized slightly later)
      let tries = 0;
      while (!publicClient && tries < 3) {
        console.log(`🔁 publicClient not ready, retrying (${tries + 1}/3) ...`);
        // small delay
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 1000));
        tries += 1;
      }

      if (!publicClient) {
        console.warn("No publicClient available after retries — attempting JSON-RPC fallback");
        // Fall back to direct JSON-RPC call if NEXT_PUBLIC_RPC_URL is provided or default to localhost
        const rpcUrl = (process.env.NEXT_PUBLIC_RPC_URL as string) || "http://localhost:8545";
        if (!rpcUrl) {
          console.warn("No RPC URL available for fallback, aborting on-chain scan");
          return;
        }

        // perform RPC-based log fetch as a fallback
        const rpcFetch = async (method: string, params: any[]) => {
          const resp = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          });
          const j = await resp.json();
          return j.result;
        };

        setIsScanningUsers(true);
        try {
          // build event ABI selector
          const eventAbi = {
            type: "event",
            name: "UserRegistered",
            inputs: [
              { indexed: true, name: "user", type: "address" },
              { indexed: false, name: "isPayer", type: "bool" },
              { indexed: false, name: "isBeneficiary", type: "bool" },
              { indexed: false, name: "isJudge", type: "bool" },
            ],
          } as const;

          const selector = getEventSelector(eventAbi as any);

          // get latest block
          const latestHex = await rpcFetch("eth_blockNumber", []);
          const latestBlock = BigInt(latestHex);

          const found: any[] = [];

          for (const mp of mpsToScan) {
            try {
              const addr = mp.marketplace;
              const logs: any[] = await rpcFetch("eth_getLogs", [
                {
                  address: addr,
                  topics: [selector],
                  fromBlock: "0x0",
                  toBlock: `0x${latestBlock.toString(16)}`,
                },
              ]);

              for (const l of logs) {
                try {
                  // adapt RPC log to shape compatible with viem decode
                  const decoded = decodeEventLog({ abi: [eventAbi as any], data: l.data, topics: l.topics }) as any;
                  found.push({
                    id: `${addr}_${parseInt(l.blockNumber ?? "0", 16)}_${l.logIndex ?? 0}`,
                    marketplace: addr,
                    user: decoded.args.user,
                    isPayer: decoded.args.isPayer,
                    isBeneficiary: decoded.args.isBeneficiary,
                    isJudge: decoded.args.isJudge,
                    transactionHash: l.transactionHash,
                    blockNumber: parseInt(l.blockNumber ?? "0", 16),
                  });
                } catch (e) {
                  console.warn("Failed to decode RPC UserRegistered log", e);
                }
              }
            } catch (e) {
              console.warn("RPC fallback failed to fetch logs for marketplace", mp, e);
            }
          }

          // Deduplicate by user+marketplace
          const dedup = Object.values(
            found.reduce((acc: Record<string, any>, item: any) => {
              const key = `${item.marketplace.toLowerCase()}_${String(item.user).toLowerCase()}`;
              if (!acc[key]) acc[key] = item;
              return acc;
            }, {}),
          );

          setRegisteredUsers(dedup);
          console.log("🔎 RPC fallback registered users found:", dedup.length, dedup.slice(0, 5));
        } finally {
          setIsScanningUsers(false);
        }

        return;
      }
    }
    if (!mpsToScan || mpsToScan.length === 0) {
      console.log("No marketplaces to scan");
      return;
    }

    setIsScanningUsers(true);
    try {
      const eventAbi = {
        type: "event",
        name: "UserRegistered",
        inputs: [
          { indexed: true, name: "user", type: "address" },
          { indexed: false, name: "isPayer", type: "bool" },
          { indexed: false, name: "isBeneficiary", type: "bool" },
          { indexed: false, name: "isJudge", type: "bool" },
        ],
      } as const;

      const selector = getEventSelector(eventAbi as any);

      const found: any[] = [];

      // Limit scan to reasonable block range if needed; using fromBlock 0 for local dev
      const latestBlock = await publicClient.getBlockNumber();

      for (const mp of mpsToScan) {
        try {
          const addr = mp.marketplace;
          const logs = await publicClient.getLogs({
            address: addr as any,
            topics: [selector],
            fromBlock: 0n,
            toBlock: BigInt(latestBlock),
          } as any);

          for (const l of logs) {
            try {
              const decoded = decodeEventLog({ abi: [eventAbi as any], data: l.data, topics: l.topics as any }) as any;
              found.push({
                id: `${addr}_${l.blockNumber}_${l.logIndex}`,
                marketplace: addr,
                user: decoded.args.user,
                isPayer: decoded.args.isPayer,
                isBeneficiary: decoded.args.isBeneficiary,
                isJudge: decoded.args.isJudge,
              });
            } catch (e) {
              console.warn("Failed to decode UserRegistered log", e);
            }
          }
        } catch (e) {
          console.warn("Failed to fetch logs for marketplace", mp, e);
        }
      }

      // Deduplicate by user+marketplace
      const dedup = Object.values(
        found.reduce((acc: Record<string, any>, item: any) => {
          const key = `${item.marketplace.toLowerCase()}_${String(item.user).toLowerCase()}`;
          if (!acc[key]) acc[key] = item;
          return acc;
        }, {}),
      );

      setRegisteredUsers(dedup);
      console.log("🔎 On-chain registered users found:", dedup.length, dedup.slice(0, 5));
    } finally {
      setIsScanningUsers(false);
    }
  };

  // Scan the blockchain for DealCreated events for known marketplaces (on-chain fallback)
  const scanDealsOnChain = async (mpsParam?: Array<{ id: string; marketplace: string; creator: string }>) => {
    const mpsToScan = mpsParam ?? marketplaces ?? [];
    console.log("🔎 scanDealsOnChain called. publicClient:", !!publicClient, "marketplacesCount:", mpsToScan.length);
    if (!publicClient) {
      // Try a few short retries for publicClient (it may be initialized slightly later)
      let tries = 0;
      while (!publicClient && tries < 3) {
        console.log(`🔁 publicClient not ready, retrying (${tries + 1}/3) ...`);
        // small delay
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 1000));
        tries += 1;
      }

      if (!publicClient) {
        console.warn("No publicClient available after retries — attempting JSON-RPC fallback for deals");
        const rpcUrl = (process.env.NEXT_PUBLIC_RPC_URL as string) || "http://localhost:8545";
        if (!rpcUrl) {
          console.warn("No RPC URL available for fallback, aborting deals scan");
          return;
        }

        const rpcFetch = async (method: string, params: any[]) => {
          const resp = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          });
          const j = await resp.json();
          return j.result;
        };

        setIsScanningDeals(true);
        try {
          const eventAbi = {
            type: "event",
            name: "DealCreated",
            inputs: [
              { indexed: true, name: "dealId", type: "uint64" },
              { indexed: true, name: "payer", type: "address" },
              { indexed: true, name: "beneficiary", type: "address" },
              { indexed: false, name: "amount", type: "uint256" },
            ],
          } as const;

          const selector = getEventSelector(eventAbi as any);
          const latestHex = await rpcFetch("eth_blockNumber", []);
          const latestBlock = BigInt(latestHex);

          const found: any[] = [];

          for (const mp of mpsToScan) {
            try {
              const addr = mp.marketplace;
              const logs: any[] = await rpcFetch("eth_getLogs", [
                {
                  address: addr,
                  topics: [selector],
                  fromBlock: "0x0",
                  toBlock: `0x${latestBlock.toString(16)}`,
                },
              ]);

              for (const l of logs) {
                try {
                  const decoded = decodeEventLog({ abi: [eventAbi as any], data: l.data, topics: l.topics }) as any;
                  found.push({
                    id: `${addr}_${parseInt(l.blockNumber ?? "0", 16)}_${l.logIndex ?? 0}`,
                    marketplace: addr,
                    dealId: decoded.args.dealId,
                    payer: decoded.args.payer,
                    beneficiary: decoded.args.beneficiary,
                    amount: decoded.args.amount,
                    transactionHash: l.transactionHash,
                    blockNumber: parseInt(l.blockNumber ?? "0", 16),
                  });
                } catch (e) {
                  console.warn("Failed to decode RPC DealCreated log", e);
                }
              }
            } catch (e) {
              console.warn("RPC fallback failed to fetch logs for marketplace", mp, e);
            }
          }

          // Deduplicate by marketplace+dealId
          const dedup = Object.values(
            found.reduce((acc: Record<string, any>, item: any) => {
              const key = `${String(item.marketplace).toLowerCase()}_${String(item.dealId)}`;
              if (!acc[key]) acc[key] = item;
              return acc;
            }, {}),
          );

          setDeals(dedup);
          console.log("🔎 RPC fallback deals found:", dedup.length, dedup.slice(0, 5));
        } finally {
          setIsScanningDeals(false);
        }

        return;
      }
    }
    if (!mpsToScan || mpsToScan.length === 0) {
      console.log("No marketplaces to scan for deals");
      return;
    }

    setIsScanningDeals(true);
    try {
      const eventAbi = {
        type: "event",
        name: "DealCreated",
        inputs: [
          { indexed: true, name: "dealId", type: "uint64" },
          { indexed: true, name: "payer", type: "address" },
          { indexed: true, name: "beneficiary", type: "address" },
          { indexed: false, name: "amount", type: "uint256" },
        ],
      } as const;

      const selector = getEventSelector(eventAbi as any);

      const found: any[] = [];

      // Limit scan to reasonable block range if needed; using fromBlock 0 for local dev
      const latestBlock = await publicClient.getBlockNumber();

      for (const mp of mpsToScan) {
        try {
          const addr = mp.marketplace;
          const logs = await publicClient.getLogs({
            address: addr as any,
            topics: [selector],
            fromBlock: 0n,
            toBlock: BigInt(latestBlock),
          } as any);

          for (const l of logs) {
            try {
              const decoded = decodeEventLog({ abi: [eventAbi as any], data: l.data, topics: l.topics as any }) as any;
              found.push({
                id: `${addr}_${l.blockNumber}_${l.logIndex}`,
                marketplace: addr,
                dealId: decoded.args.dealId,
                payer: decoded.args.payer,
                beneficiary: decoded.args.beneficiary,
                amount: decoded.args.amount,
              });
            } catch (e) {
              console.warn("Failed to decode DealCreated log", e);
            }
          }
        } catch (e) {
          console.warn("Failed to fetch logs for marketplace", mp, e);
        }
      }

      // Deduplicate by marketplace+dealId
      const dedup = Object.values(
        found.reduce((acc: Record<string, any>, item: any) => {
          const key = `${String(item.marketplace).toLowerCase()}_${String(item.dealId)}`;
          if (!acc[key]) acc[key] = item;
          return acc;
        }, {}),
      );

      setDeals(dedup);
      console.log("🔎 On-chain deals found:", dedup.length, dedup.slice(0, 5));
    } finally {
      setIsScanningDeals(false);
    }
  };

  // re-scan when marketplaces change
  useEffect(() => {
    if (marketplaces && marketplaces.length > 0) {
      scanRegisteredUsersOnChain().catch(e => console.error(e));
      scanDealsOnChain().catch(e => console.error(e));
    }
  }, [marketplaces]);

  // Update Envio config
  const updateEnvioConfig = async () => {
    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      console.log("🔄 Updating Envio config...");
      const response = await fetch("/api/envio/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        setUpdateMessage(`✅ ${result.message}`);
        console.log("✅ Config updated successfully");

        // Auto-hide success message after 10 seconds
        setTimeout(() => {
          setUpdateMessage(null);
        }, 10000);
      } else {
        setUpdateMessage(`❌ ${result.message}`);
        console.error("❌ Config update failed:", result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setUpdateMessage(`❌ Failed to update config: ${errorMessage}`);
      console.error("❌ Error updating config:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGenerateConfig = () => {
    if (
      confirm(
        "⚠️ Are you sure you want to regenerate?\n\n" +
          "This will rewrite these files with boilerplate code:\n" +
          "• config.yaml\n" +
          "• schema.graphql\n" +
          "• src/EventHandlers.ts\n\n" +
          "Custom modifications will be lost. Continue?",
      )
    ) {
      updateEnvioConfig();
    }
  };

  // Check status on component mount and every 30 seconds
  useEffect(() => {
    checkIndexerStatus();
    const interval = setInterval(checkIndexerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch events when indexer becomes active
  useEffect(() => {
    if (indexerStatus === "active") {
      fetchEvents();
    }
  }, [indexerStatus, fetchEvents]);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8">
      <div className="max-w-4xl w-full px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="https://docs.envio.dev/img/envio-logo.png" alt="Envio Logo" className="h-16 w-auto" />
          </div>
          <p className="text-lg text-base-content/70">Here you can access all the indexed data.</p>
        </div>

        {/* Main Content */}
        <div className="bg-base-100 rounded-lg shadow-lg p-6">
          <div className="text-center">

            {/* Status Card */}
            <div
              className={`rounded-lg p-4 mb-6 ${
                indexerStatus === "active"
                  ? "bg-success/10 border border-success/20"
                  : indexerStatus === "inactive"
                    ? "bg-error/10 border border-error/20"
                    : "bg-warning/10 border border-warning/20"
              }`}
            >
              <div className="flex items-center justify-center mb-2">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    indexerStatus === "active"
                      ? "bg-success"
                      : indexerStatus === "inactive"
                        ? "bg-error"
                        : "bg-warning animate-pulse"
                  }`}
                ></div>
                <span
                  className={`font-semibold ${
                    indexerStatus === "active"
                      ? "text-success"
                      : indexerStatus === "inactive"
                        ? "text-error"
                        : "text-warning"
                  }`}
                >
                  Indexer Status:{" "}
                  {indexerStatus === "active" ? "Active" : indexerStatus === "inactive" ? "Inactive" : "Checking..."}
                </span>
              </div>
              <p className="text-sm text-base-content/70">
                {indexerStatus === "inactive" ? (
                  <>
                    Indexer is not running. Start the indexer by running <code>pnpm dev</code> in the{" "}
                    <code>packages/envio</code> directory.
                    <br />
                    (be sure to generate it first if you haven&apos;t already)
                  </>
                ) : indexerStatus === "checking" ? (
                  "Checking indexer status..."
                ) : (
                  ""
                )}
              </p>
              {lastChecked && (
                <p className="text-xs text-base-content/50 mt-2">Last checked: {lastChecked.toLocaleTimeString()}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-semibold">GraphQL Endpoint:</span>
                <code className="text-xs bg-base-300 px-2 py-1 rounded flex-1">http://localhost:8080/v1/graphql</code>
                <button
                  onClick={() => navigator.clipboard.writeText("http://localhost:8080/v1/graphql")}
                  className="btn btn-ghost btn-xs"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
              {indexerStatus === "inactive" && (
                <button onClick={checkIndexerStatus} className="btn btn-sm btn-outline mt-2">
                  Retry Check
                </button>
              )}
            </div>


            {/* Panel Overview - quick link to detailed deals panel */}
            <div className="bg-base-200 rounded-lg p-4 mb-6 mt-6">
              <h3 className="font-semibold mb-2 flex items-center">
                <BoltIcon className="h-5 w-5 mr-2 text-primary" />
                Panel Overview
              </h3>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex-1">
                  {/* Show user's connected address here (or Not connected) */}
                  <div className="p-3 bg-base-100 rounded shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-xs text-base-content/60">Your address</div>
                      <div className="text-lg font-bold">{isConnected ? address : "Not connected"}</div>
                      <div className="text-xs text-base-content/60">Connected wallet address</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <a
                        className="btn btn-sm btn-outline w-full sm:w-auto"
                        href={address ? `https://sepolia.blockscout.io/address/${address}` : "#"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on Blockscout
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right column placeholder - keeps layout balanced on wide screens */}
                <div className="flex-shrink-0 w-full sm:w-auto" />
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">

                <a
                  href="/envio/overview"
                  className="btn btn-primary px-6 py-3 rounded-md shadow-md text-base w-full sm:w-auto"
                  style={{ minWidth: 160 }}
                >
                  Open Overview
                </a>
              </div>
            </div>



            {/* Marketplaces indexed by Envio */}
            <div className="mb-8">
              <div className="bg-base-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-center">Indexed Marketplaces</h3>
                {marketplaces.length === 0 ? (
                  <div className="text-sm text-base-content/50 text-center">No marketplaces indexed yet</div>
                ) : (
                  <div className="space-y-2">
                    {marketplaces.map(mp => (
                      <div key={mp.id} className="p-2 bg-base-300 rounded">
                        <div className="text-left">
                          <div className="text-sm font-bold break-all">{mp.marketplace}</div>
                          <div className="text-xs text-base-content/70">creator: {mp.creator}</div>
                        </div>

                        {/* Actions below the address to avoid cramped layout */}
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => navigator.clipboard.writeText(mp.marketplace)}
                            title="Copy marketplace address"
                          >
                            📋
                          </button>
                          <a
                            className="btn btn-primary btn-xs"
                            href={`https://sepolia.etherscan.io/address/${mp.marketplace}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


              {/* Registered Users (indexed by Envio) */}
              <div className="bg-base-200 rounded-lg p-4 mb-8">
                <h3 className="font-semibold mb-2 text-center">Registered Users</h3>
                  {isScanningUsers ? (
                    <div className="text-sm text-base-content/70 text-center">Scanning chain for registered users...</div>
                  ) : registeredUsers.length === 0 ? (
                    <div className="text-sm text-base-content/50 text-center">No registered users indexed yet</div>
                  ) : (
                  <div className="space-y-2">
                    {registeredUsers.map((u: any, i: number) => (
                      <div key={u.id ?? i} className="p-2 bg-base-300 rounded text-xs">
                        {Object.entries(u)
                          .filter(([k, v]) => k !== "id" && k !== "isJudge")
                          .map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="font-bold text-base-content mr-2">{k}:</span>
                            <span className="font-mono">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={() => scanRegisteredUsersOnChain().catch(e => console.error(e))}
                    disabled={isScanningUsers}
                    className="btn btn-sm btn-outline"
                    title="Force on-chain rescan for registered users"
                  >
                    {isScanningUsers ? "Scanning..." : "Rescan Users on-chain"}
                  </button>
                </div>
              </div>

              {/* Deals (on-chain or via Envio) */}
              <div className="bg-base-200 rounded-lg p-4 mb-8">
                <h3 className="font-semibold mb-2 text-center">Deals Created</h3>
                {isScanningDeals ? (
                  <div className="text-sm text-base-content/70 text-center">Scanning chain for deals...</div>
                ) : deals.length === 0 ? (
                  <div className="text-sm text-base-content/50 text-center">No deals indexed yet</div>
                ) : (
                  <div className="space-y-2">
                    {deals.map((d: any, i: number) => (
                      <div key={d.id ?? i} className="p-2 bg-base-300 rounded text-xs">
                        {Object.entries(d).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="font-bold text-base-content mr-2">{k}:</span>
                            <span className="font-mono">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={() => scanDealsOnChain().catch(e => console.error(e))}
                    disabled={isScanningDeals}
                    className="btn btn-sm btn-outline"
                    title="Force on-chain rescan for deals"
                  >
                    {isScanningDeals ? "Scanning..." : "Rescan Deals on-chain"}
                  </button>
                </div>
              </div>

              {/* Events Display */}
            {indexerStatus === "active" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-base-200 rounded-lg p-4 relative">
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={fetchEvents}
                      disabled={isLoadingEvents}
                      className="btn btn-sm btn-ghost btn-circle"
                      title="Refresh Event Counts"
                    >
                      {isLoadingEvents ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  <h3 className="font-semibold mb-2 text-center flex items-center justify-center">
                    <BoltIcon className="h-5 w-5 mr-2 text-primary" />
                    Event Counts
                  </h3>
                  {isLoadingEvents ? (
                    <div className="text-sm text-base-content/70">Loading events...</div>
                  ) : eventCounts ? (
                    <div className="space-y-2">
                      {Object.entries(eventCounts).map(([eventType, count]) => {
                        if (count === 0) return null;
                        
                        // Create a mapping for user-friendly names
                        const friendlyName = getFriendlyName(eventType);
                        
                        return (
                          <div key={eventType} className="flex justify-between text-sm">
                              <span className="text-base-content/70">{friendlyName}</span>
                              <span className="font-semibold text-base-content/70">{String(count)}</span>
                            </div>
                        );
                      })}
                      {Object.values(eventCounts).every(count => count === 0) && (
                        <div className="text-sm text-base-content/50">No events indexed yet</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-base-content/70">Failed to load events</div>
                  )}
                </div>

                <div className="bg-base-200 rounded-lg p-4 relative">
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={fetchEvents}
                      disabled={isLoadingEvents}
                      className="btn btn-sm btn-ghost btn-circle"
                      title="Refresh Recent Events"
                    >
                      {isLoadingEvents ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  <h3 className="font-semibold mb-2 text-center flex items-center justify-center">
                    <BoltIcon className="h-5 w-5 mr-2 text-primary" />
                    Recent Events
                  </h3>
                  {isLoadingEvents ? (
                    <div className="text-sm text-base-content/70">Loading recent events...</div>
                  ) : recentEvents ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {Object.entries(recentEvents).map(([eventType, events]: [string, any]) => {
                        if (!events || events.length === 0) return null;

                        // Find the entity info for this event type
                        const entityInfo = schemaEntities.find(e => e.name === eventType);

                        return events.map((event: any, index: number) => (
                          <div key={`${eventType}-${index}`} className="text-xs bg-base-300 p-2 rounded">
                            <div className="font-semibold text-primary mb-1">
                              {getFriendlyName(eventType)}
                            </div>

                            {/* Dynamically render fields based on schema */}
                            {entityInfo &&
                              entityInfo.fields.map(field => {
                                const value = event[field.name];
                                if (value === undefined || value === null) return null;

                                return (
                                  <div key={field.name} className="text-left">
                                    <span className="font-bold text-base-content">{field.name}:</span>{" "}
                                    <span className="font-mono">
                                      {typeof value === "object" ? JSON.stringify(value) : value.toString()}
                                    </span>
                                  </div>
                                );
                              })}

                            {/* Fallback for unknown fields */}
                            {!entityInfo &&
                              Object.entries(event).map(([key, value]) => {
                                return (
                                  <div key={key} className="text-left">
                                    <span className="font-bold text-base-content">{key}:</span>{" "}
                                    <span className="font-mono">
                                      {typeof value === "object" ? JSON.stringify(value) : value?.toString()}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        ));
                      })}
                      {Object.values(recentEvents).every((events: any) => !events || events.length === 0) && (
                        <div className="text-sm text-base-content/50">No recent events</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-base-content/70">Failed to load recent events</div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Links (moved to bottom) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-base-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-center flex items-center justify-center">
                  <BoltIcon className="h-5 w-5 mr-2 text-primary" />
                  Envio Console
                </h3>
                <p className="text-sm text-base-content/70 mb-3">View your indexer progress and analytics.</p>
                <a
                  href="https://envio.dev/console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  Open Console
                </a>
              </div>

              <div className="bg-base-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-center flex items-center justify-center">
                  <BoltIcon className="h-5 w-5 mr-2 text-primary" />
                  Hasura Console
                </h3>
                <p className="text-sm text-base-content/70 mb-3">View and query all your indexed data in Hasura.</p>
                <a
                  href="http://localhost:8080/console/data/manage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  Open Hasura
                </a>
              </div>
            </div>

            {/* Generate Button */}
            <div className="bg-base-200 rounded-lg p-4 mb-8 mt-6">
              <h3 className="font-semibold mb-2 flex items-center">
                <BoltIcon className="h-5 w-5 mr-2 text-primary" />
                Generate Boilerplate Indexer
              </h3>
              <p className="text-sm text-base-content/70 mb-3">
                Generate the Envio configuration files based on your current deployed contracts (deployed via yarn
                deploy). This will overwrite the config.yaml, schema.graphql, and EventHandlers.ts files to set up a
                boilerplate indexer ready to index these contracts
              </p>
              <button
                onClick={handleGenerateConfig}
                disabled={isUpdating}
                className={`btn btn-primary btn-sm ${isUpdating ? "loading" : ""}`}
              >
                {isUpdating ? "Generating..." : "Generate"}
              </button>
              {updateMessage && (
                <div
                  className={`mt-3 p-2 rounded text-sm ${
                    updateMessage.startsWith("✅")
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-error/10 text-error border border-error/20"
                  }`}
                >
                  {updateMessage}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvioPage;
