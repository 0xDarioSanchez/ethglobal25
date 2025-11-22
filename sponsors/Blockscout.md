# Blockscout Integration  
#### Transparency and Trust through Open Exploration  

## Overview  

Blockscout’s **Autoscout** allows Lancer to provide users and judges with full visibility into all on-chain actions.  
By deploying a custom Blockscout explorer through Autoscout, every contract interaction — from escrow creation to dispute resolution — becomes publicly verifiable and developer-accessible via API.  

Transparency is the foundation of trust in decentralized marketplaces.  
Blockscout empowers Lancer to offer **verifiable, human-readable proof** of every contract action, without relying on centralized intermediaries.  

With Autoscout, the Lancer ecosystem gains an **open-source explorer** that enhances user confidence, auditability, and developer onboarding.  

## How Blockscout is Integrated  

1. **Autoscout Deployment**  
   1.1. Using Blockscout’s self-service explorer launchpad, Lancer deployed a dedicated explorer instance connected to the testnet used during development.  
   1.2. This enables a one-click view of all transactions, addresses, and smart contract metadata.  

2. **Custom Configuration**  
   2.1. The explorer is branded for Lancer, displaying all core protocol contracts and deployed marketplace instances.  
   2.2. Each contract’s verified source code is published directly through Blockscout for public inspection.  

3. **API Integration**  
   3.1. The frontend connects to the Blockscout API to retrieve real-time transaction data and link users directly to verified on-chain actions.  
   3.2. This enhances transparency for all participants — **Payers, Beneficiaries, and Judges**.  

4. **Developer & User Benefits**  
   4.1. Developers can debug and audit contract behavior easily through Blockscout’s verified source views.  
   4.2. Users gain confidence through **full traceability** of every escrow, payment, and dispute decision.  

## Dynamic Multi-Marketplace Support  

Lancer operates as a **contract factory**, enabling users to deploy their own marketplaces directly from the `LancerFactory` contract.  
Each new marketplace automatically becomes visible and verifiable through the same Blockscout instance — without requiring any extra setup.  

Because Blockscout indexes all contracts deployed on the same network, every new marketplace inherits **instant transparency** and **public accessibility**.  
From the Lancer frontend, users and creators can open direct “View on Blockscout” links for their own deployed contracts, ensuring that trust and traceability scale seamlessly with ecosystem growth.  

This approach transforms the Blockscout instance into a **shared transparency layer** for all marketplaces deployed within Lancer.  

## Why This Integration  

Lancer’s integration showcases Autoscout’s potential as a **fast and flexible explorer launchpad** for any EVM-based ecosystem.  

| **Hackathon Criteria** | **Lancer’s Value** |
|-------------------------|--------------------|
| **Ease of Use** | Deployed a custom explorer in minutes using Autoscout. |
| **Integration** | Linked the explorer directly with the Lancer frontend and backend for seamless UX. |
| **Transparency** | Enabled users and judges to verify every transaction and dispute resolution process. |
| **Scalability** | Automatically supports all new marketplaces deployed via the Lancer Factory. |
| **Open Access** | Public explorer and API endpoints provide on-chain visibility for developers and users alike. |

## Explorer Links  

Explore the deployed Lancer contracts on our Blockscout instance:  
- 🧩 [Lancer Factory](https://lancer.cloud.blockscout.com/address/0xaf237a6455d1fa2987dbb03d340514f16b9f6789?tab=contract)  
- ⚖️ [Lancer Protocol](https://lancer.cloud.blockscout.com/address/0x8ddc8381e840f6f04309b044411430fa8be48a10?tab=contract)  
- 💼 [Marketplace Instance](https://lancer.cloud.blockscout.com/address/0xae1fb4f4aa5f647a29300badc83fde2674491b72?tab=contract)  

## Summary  

**Lancer + Blockscout = Verifiable Trust for Every Transaction.**  

By using Autoscout to launch a dedicated explorer, Lancer delivers a transparent and auditable experience that scales automatically with every new marketplace created through the Factory contract — reinforcing confidence across all stakeholders, from developers to users.
