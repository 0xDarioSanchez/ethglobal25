"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BoltIcon,
  UserIcon,
  CurrencyDollarIcon,
  CubeIcon,
  ChartBarIcon,
  ClockIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { getRecentEvents, getSchemaEntities, EntityInfo } from "~~/utils/graphql";

const getFriendlyName = (eventType: string): string => {
  return eventType
    .replace(/MockPYUSD/g, "PYUSD")
    .replace(/MockAavePool/g, "Aave Pool")
    .replace(/ProtocolContract/g, "Protocol")
    .replace(/FactoryContract/g, "Factory")
    .replace(/MarketplaceInstance/g, "Marketplace")
    .replace(/_/g, " ");
};

const OverviewPage = () => {
  const [deals, setDeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [schemaEntities, setSchemaEntities] = useState<EntityInfo[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const ents = await getSchemaEntities();
        if (!mounted) return;
        setSchemaEntities(ents || []);

        // fetch recent events (a larger number to populate the panel)
        const events = await getRecentEvents(200);
        if (!mounted) return;

        // try to find the deals entity
        const dealsKey = Object.keys(events || {}).find(k => /dealcreated|deal_created|deal/i.test(k));
        const foundDeals = dealsKey ? events[dealsKey] || [] : [];

        // Normalize items to a common shape if possible
        const normalized = (foundDeals || []).map((d: any, i: number) => {
          return {
            id: d.id ?? d.dealId ?? `${dealsKey}_${i}`,
            raw: d,
            dealId: d.dealId ?? d.id ?? null,
            payer: d.payer ?? d.payerAddress ?? d.args?.payer ?? null,
            beneficiary: d.beneficiary ?? d.beneficiaryAddress ?? d.args?.beneficiary ?? null,
            amount: d.amount ?? d.args?.amount ?? null,
            marketplace: d.marketplace ?? d.marketplaceAddress ?? null,
          };
        });

        setDeals(normalized);
      } catch (e) {
        console.error("Failed to load deals for overview", e);
        setDeals([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src="https://docs.envio.dev/img/envio-logo.png" alt="Envio" className="h-12" />
            <div>
              <h1 className="text-2xl font-bold">Visual panel</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/envio" className="btn btn-ghost">
              Back
            </Link>
            <a href="/envio" className="btn btn-primary">
              Refresh
            </a>
          </div>
        </div>

        <div className="mb-6">
          {/* User summary / demo panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-base-200 rounded shadow-sm flex items-center gap-3">
              <CurrencyDollarIcon className="h-6 w-6 text-primary" />
              <div>
                <div className="text-sm text-base-content/60">Your balance</div>
                <div className="font-bold text-lg">68.6 PYUSD</div>
                <div className="text-xs text-base-content/60">Available balance in your wallet</div>
              </div>
            </div>

            <div className="p-4 bg-base-200 rounded shadow-sm flex items-center gap-3">
              <CheckBadgeIcon className="h-6 w-6 text-primary" />
              <div>
                <div className="text-sm text-base-content/60">Your reputation</div>
                <div className="font-bold text-lg">1</div>
                <div className="text-xs text-base-content/60">Reputation score</div>
              </div>
            </div>

            <div className="p-4 bg-base-200 rounded shadow-sm flex items-center gap-3">
              <ChartBarIcon className="h-6 w-6 text-primary" />
              <div>
                <div className="text-sm text-base-content/60">Deals you're working on</div>
                <div className="font-bold text-lg">1 active</div>
                <div className="text-xs text-base-content/60">Manage and view details below</div>
              </div>
            </div>
          </div>

          {/* Demo active deals (mocked) */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-3">Active deals</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-base-100 rounded-lg shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">Deal: ID 1</div>
                    <div className="text-xs text-base-content/60">Finished 0 days ago</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-base-content/60">Escrow</div>
                    <div className="font-mono font-bold">70 PYUSD</div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-base-content/70">Status: <span className="font-semibold">Finished</span></div>
                <div className="mt-3 flex items-center gap-2 text-xs text-base-content/60">
                  <ClockIcon className="h-4 w-4" />
                  <span>Duration 30 days</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <a className="btn btn-sm btn-ghost" href="#">Open</a>
                  <button className="btn btn-sm btn-outline">View transactions history</button>
                </div>
              </div>

              <div className="p-4 bg-base-100 rounded-lg shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">Deal: ID 2</div>
                    <div className="text-xs text-base-content/60">Active</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-base-content/60">Escrow</div>
                    <div className="font-mono font-bold">30 PYUSD</div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-base-content/70">Status: <span className="font-semibold">In progress</span></div>
                <div className="mt-3 flex items-center gap-2 text-xs text-base-content/60">
                  <ClockIcon className="h-4 w-4" />
                  <span>Estimated finish: 7 days</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <a className="btn btn-sm btn-ghost" href="#">Open</a>
                  <button className="btn btn-sm btn-outline">Message counterpart</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="text-center py-12 text-base-content/70">Loading...</div>
          ) : deals.length === 0 ? (
            <div className="text-center py-12 text-base-content/50">Data loaded.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {deals.map((d: any) => (
                <div key={d.id} className="bg-base-100 rounded-lg shadow hover:shadow-lg transition p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-2 rounded">
                        <BoltIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">{d.dealId ?? getFriendlyName(d.id)}</div>
                        <div className="text-xs text-base-content/60">{d.marketplace ?? "Unknown marketplace"}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-base-content/60">Amount</div>
                      <div className="font-mono font-bold">{d.amount ? String(d.amount) : "—"}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Payer</span>
                      <span className="font-mono">{d.payer ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Beneficiary</span>
                      <span className="font-mono">{d.beneficiary ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Raw</span>
                      <span className="text-xs font-mono text-right line-clamp-1">{JSON.stringify(d.raw || {}).slice(0, 80)}{String(d.raw && JSON.stringify(d.raw).length > 80 ? '…' : '')}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <a
                      className="btn btn-ghost btn-sm"
                      href={`https://sepolia.etherscan.io/tx/${d.raw?.transactionHash ?? ''}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View TX
                    </a>
                    <button
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(d.raw || {}))}
                      className="btn btn-outline btn-sm"
                    >
                      Copy Raw
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
