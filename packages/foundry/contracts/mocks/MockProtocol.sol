// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lancer-protocol/MarketplaceInstance.sol";
import "../lancer-protocol/ProtocolContract.sol";

// Only using createDispute for testing purposes
contract MockProtocol {
    event DisputeCreated(uint256 indexed disputeId, address indexed requester, address indexed contractAddress);

    function createDispute(address _requester) external {
        emit DisputeCreated(0, _requester, msg.sender);
    }

}
