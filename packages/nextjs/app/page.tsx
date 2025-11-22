"use client";

import Link from "next/link";
import Image from "next/image";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-base-100 to-base-200">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl md:text-6xl font-extrabold">Lancer Protocol</h1>
            <p className="text-sm text-base-content/60">Decentralized marketplaces & dispute resolution</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-base-content/60">Connected:</p>
            <Address address={connectedAddress} />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-6 flex-1">
        {/* Hero */}
        <section className="bg-base-100 rounded-2xl p-8 md:p-12 shadow-lg relative overflow-hidden">
          <div className="md:flex md:items-center md:justify-between">
            <div className="md:flex-1 z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Deploy your own on-chain marketplaces
              </h2>
              <p className="text-lg text-base-content/70 mb-6 max-w-3xl">
                Lancer Protocol allows anyone to deploy and manage decentralized marketplaces with integrated
                escrow systems and indexed on-chain data — all connected to a decentralized dispute resolution network.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/debug" className="btn btn-primary btn-md">
                  Open App
                </Link>
                <Link href="https://lancer.cloud.blockscout.com" className="btn btn-outline btn-md">
                  Block Explorer
                </Link>
                <Link href="/about" className="btn btn-outline btn-md">
                  About
                </Link>
                <a
                  href="https://github.com/0xDarioSanchez/ETHG25"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-md"
                >
                  View on GitHub
                </a>
              </div>
            </div>

            {/* Hero Image */}
            <div className="mt-8 md:mt-0 md:ml-8 w-full md:w-96 relative z-10">
              <Image
                src="/images/blockchain.svg"
                alt="Blockchain illustration"
                width={400}
                height={400}
                className="rounded-xl"
                priority
              />
            </div>
          </div>

          {/* Background shape */}
          <div className="absolute inset-0 opacity-10 bg-[url('/images/grid-pattern.svg')] bg-center bg-cover"></div>
        </section>

        {/* Features + CTA side by side */}
        <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dispute Resolution Card */}
          <div className="bg-base-100 p-6 rounded-2xl shadow hover:shadow-md transition text-center">
            <Image
              src="/images/judge.svg"
              alt="Dispute resolution"
              width={140}
              height={140}
              className="mx-auto mb-4"
            />
            <h3 className="font-semibold mb-2">Decentralized Dispute Resolution</h3>
            <p className="text-sm text-base-content/70 mb-4">
              Manage disputes and judge payouts transparently through the Lancer Protocol's arbitration layer.
            </p>
            <Link href="/debug" className="btn btn-sm btn-outline">
              Inspect Contracts
            </Link>
          </div>

          {/* Ready to Build Card */}
          <div className="bg-base-100 p-6 rounded-2xl shadow hover:shadow-md transition text-center flex flex-col justify-center">
            <h3 className="text-2xl font-bold mb-3">Ready to build?</h3>
            <p className="text-base text-base-content/70 mb-6">
              Start by deploying your own marketplace and interact with it.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/debug" className="btn btn-primary btn-md">
                Launch App
              </Link>
              <Link href="/envio" className="btn btn-outline btn-md">
                View Indexer
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-base-300">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="text-sm text-base-content/70">
            © {new Date().getFullYear()} Lancer Protocol
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/0xDarioSanchez/ETHG25" target="_blank" rel="noreferrer" className="text-sm">
              GitHub
            </a>
            <Link href="/debug" className="text-sm">
              App
            </Link>
            <Link href="/envio" className="text-sm">
              Envio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
