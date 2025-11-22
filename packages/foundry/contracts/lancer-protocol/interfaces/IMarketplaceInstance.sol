//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

interface IMarketplaceInstance {
    function applyDisputeResult(uint64 _disputeId, bool _result) external;
}