"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-base-100 py-12">
      <div className="container mx-auto px-6">
        <div className="bg-base-200 rounded-2xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold mb-4">About Lancer Protocol</h1>

          <section className="prose max-w-none text-base-content/80">
            <p>
              <strong>Lancer Protocol</strong> is an open-source protocol for building on-top decentralized
              applications (dApps) on the Ethereum blockchain. It's designed for developers to create and deploy their
              own dApps with on-chain escrows, payments and dispute resolution systems.
            </p>

            <h2>Problem</h2>
            <p>
              Centralized marketplace platforms charge high fees, can delay cross-border payments for several days and
              have an average cost in the industry of around <strong>6.04%</strong>. Their dispute processes are also
              centralized and opaque, which creates trust and fairness issues.
            </p>

            <h2>Solution</h2>
            <p>
              <strong>Lancer Protocol</strong> provides the foundational infrastructure for decentralized marketplaces
              and payment applications. It allows developers to integrate secure escrow mechanisms, on-chain dispute
              resolution, and programmable payment flows directly into their dApps, without rebuilding these components
              from scratch.
            </p>

            <ul>
              <li>
                <strong>Low Fees</strong>: Minimized fees through revenue models based on yield from lending protocols
                (e.g., Aave).
              </li>
              <li>
                <strong>Fast Payments</strong>: Sellers can withdraw instantly to wallets, avoiding bank conversion and
                cross-border delays.
              </li>
              <li>
                <strong>Free Payments</strong>: Ethereum transfers have minimal costs even across borders.
              </li>
              <li>
                <strong>Trustless Escrow</strong>: Smart contracts lock funds and release on verified conditions, reducing
                dispute bias.
              </li>
              <li>
                <strong>Transparency</strong>: Escrow and voting systems are open-source and immutable; transactions are
                public on block explorers.
              </li>
            </ul>

            <h2>Overview</h2>
            <p>
              At its core, Lancer Protocol standardizes how digital agreements and payments are handled on-chain. Key
              concepts include:
            </p>
            <ul>
              <li>
                <strong>Escrow Contracts</strong> hold funds in <code>PYUSD</code> until both parties are satisfied.
              </li>
              <li>
                <strong>Dispute Resolution Layer</strong> enables verifiable and transparent dispute handling, optionally
                augmented with decentralized oracles or arbitration modules.
              </li>
              <li>
                <strong>Modular Architecture</strong> lets developers plug reputation systems, insurance, arbitration,
                AI modules and more.
              </li>
            </ul>

            <h2>How It Works</h2>
            <p>
              <strong>Escrow Creation</strong>: A buyer or dApp creates an escrow via EscrowManager, specifying a seller
              and an amount in <code>PYUSD</code>. Funds are locked until release or dispute.
            </p>
            <p>
              <strong>Safe Payments</strong>: Payments remain in escrow until both sides approve, allowing custom logic
              for deadlines, milestones or deliverables.
            </p>
            <p>
              <strong>Dispute Handling</strong>: If a disagreement occurs, users trigger a dispute through DisputeManager.
              The protocol emits verifiable events (indexable via Envio) and can optionally settle cross-chain with
              Avail.
            </p>

            <h2>Integration Points</h2>
            <ul>
              <li>
                <strong>Cross-Chain Execution (Avail)</strong>: Avail Nexus SDK enables cross-chain intent execution so
                escrow operations can span networks.
              </li>
              <li>
                <strong>Data Indexing (Envio)</strong>: On-chain events are indexed with Envio HyperIndex for fast
                queries and analytics dashboards.
              </li>
            </ul>

            <p>
              This modular approach makes Lancer Protocol a composable backend for trustless applications—ideal for
              freelance marketplaces, DAO bounties, agentic payment flows, and peer-to-peer commerce.
            </p>
          </section>

          <div className="mt-6 flex gap-3">
            <Link href="/" className="btn btn-ghost">Back</Link>
            <Link href="/debug" className="btn btn-primary">Open App</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
