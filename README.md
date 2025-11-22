🌐 An open-source protocol that allows anyone to create and deploy their own marketplaces on the Ethereum blockchain in a few seconds.

## Problem we focus on
Centralized marketplace platforms charge high fees, in case of cross-border payments they can be delayed for several days and have an average cost of 6.04%. Additionally, they rely on dispute processes centralized in the same platforms.

## Solution

**Lancer** provides the infrastructure for decentralized marketplaces and payment applications, by allowing anyone to deploy their own marketplaces, with secure escrow mechanisms and on-chain dispute resolution. While obtaining:
- **Lower Fees**: Marketplace owners can offer reduced fees because locked funds generate yield through lending protocols, providing an automatic extra income.
- **Fast Payments**: Users can withdraw instantly to their wallets, avoiding conversion costs and cross-border bank delays.
- **Free Payments**: Transfers through Ethereum have zero extra costs even in case of cross-border payments.
- **Trustless Escrow**: Smart contracts lock funds, releasing only on verified conditions.
- **Transparency**: The entire system is open-source and immutable while all transactions are public on Blockscout.
- **Honesty**: In case of disagreement, users can request a dispute resolution, which based on games' theory incentivaze jusged to for being honest.
  
------------------------------

## How It Works

![flow](images/flow.png "Flow")

1. Anyone, lets say `Creator`, can deploy a marketplace through `Lancer Factory`
2. Users register on the marketplace as either `Payers` (the ones who pay for services, products, etc.) or `Beneficiaries` (the ones who receive the payments, such as freelancers or sellers).
3. The `Payer` and `Beneficiary` agree on the `Deal` conditions, such as the PYUSD amount, duration, milestones, and metadata.
4. When the Payer accepts, PYUSD tokens are transferred to the marketplace contract. 
4.1. In the same transaction, those tokens are supplied to Aave to generate yield. The yield earnings can only be withdrawn by the Creator or an account designated by them.
5. If the `Payer` considers that the `Deal` conditions have been met, they can finalize it, allowing the `Beneficiary` to withdraw the corresponding PYUSD amount.
5.1. If the agreed duration plus one additional week has passed, the `Beneficiary` automatically becomes eligible to withdraw the corresponding amount.
5.2. A percentage fee is always subtracted from the `Beneficiary’s` final balance. This percentage is defined by the `Creator` and can range between 0 and 100.
6. If the `
