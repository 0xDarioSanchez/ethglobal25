// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import "../../contracts/lancer-protocol/ProtocolContract.sol";

contract ProtocolHelper is ProtocolContract {
    constructor(address _owner, address _pyusd) ProtocolContract(_owner, _pyusd) {}

    // This helper function can modify internal state for testing
    function setJudgeBalance(address _judge, uint256 _amount) external {
        judges[_judge].balance = _amount;
    }

    function getDisputeResult() external pure returns (bool) {
        return true;
    }
}