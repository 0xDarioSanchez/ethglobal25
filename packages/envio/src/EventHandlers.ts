/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 * This file is auto-generated from scaffold-eth contracts
 */
import {
  MockPYUSD,
  MockPYUSD_Approval,
  MockPYUSD_Transfer,
  MockAavePool,
  MockAavePool_Supplied,
  MockAavePool_Withdrawn,
  ProtocolContract,
  ProtocolContract_DisputeCreated,
  ProtocolContract_DisputeResolved,
  ProtocolContract_JudgeRegistered,
  FactoryContract,
  FactoryContract_MarketplaceDeployed,
} from "generated";

MockPYUSD.Approval.handler(async ({ event, context }) => {
  const entity: MockPYUSD_Approval = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    spender: event.params.spender,
    value: event.params.value,
  };

  context.MockPYUSD_Approval.set(entity);
});

MockPYUSD.Transfer.handler(async ({ event, context }) => {
  const entity: MockPYUSD_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    value: event.params.value,
  };

  context.MockPYUSD_Transfer.set(entity);
});

MockAavePool.Supplied.handler(async ({ event, context }) => {
  const entity: MockAavePool_Supplied = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    asset: event.params.asset,
    amount: event.params.amount,
    onBehalfOf: event.params.onBehalfOf,
  };

  context.MockAavePool_Supplied.set(entity);
});

MockAavePool.Withdrawn.handler(async ({ event, context }) => {
  const entity: MockAavePool_Withdrawn = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    asset: event.params.asset,
    amount: event.params.amount,
    to: event.params.to,
  };

  context.MockAavePool_Withdrawn.set(entity);
});

ProtocolContract.DisputeCreated.handler(async ({ event, context }) => {
  const entity: ProtocolContract_DisputeCreated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    disputeId: event.params.disputeId,
    requester: event.params.requester,
    contractAddress: event.params.contractAddress,
  };

  context.ProtocolContract_DisputeCreated.set(entity);
});

ProtocolContract.DisputeResolved.handler(async ({ event, context }) => {
  const entity: ProtocolContract_DisputeResolved = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    disputeId: event.params.disputeId,
    winner: event.params.winner,
  };

  context.ProtocolContract_DisputeResolved.set(entity);
});

ProtocolContract.JudgeRegistered.handler(async ({ event, context }) => {
  const entity: ProtocolContract_JudgeRegistered = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    judge: event.params.judge,
  };

  context.ProtocolContract_JudgeRegistered.set(entity);
});

FactoryContract.MarketplaceDeployed.handler(async ({ event, context }) => {
  const entity: FactoryContract_MarketplaceDeployed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    marketplace: event.params.marketplace,
    creator: event.params.creator,
  };

  context.FactoryContract_MarketplaceDeployed.set(entity);
});

