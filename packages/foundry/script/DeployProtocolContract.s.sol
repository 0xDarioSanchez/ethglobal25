// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/lancer-protocol/ProtocolContract.sol";

/**
 * @notice Deploy script for ProtocolContract contract
 * @dev Inherits ScaffoldETHDeploy which:
 *      - Includes forge-std/Script.sol for deployment
 *      - Includes ScaffoldEthDeployerRunner modifier
 *      - Provides `deployer` variable
 * Example:
 * yarn deploy --file DeployProtocolContract.s.sol  # local anvil chain
 * yarn deploy --file DeployProtocolContract.s.sol --network optimism # live network (requires keystore)
 */
contract DeployProtocolContract is ScaffoldETHDeploy {
    function run() external returns (ProtocolContract) {
        ProtocolContract protocol = new ProtocolContract(deployer, token);
        return protocol;
    }
}
