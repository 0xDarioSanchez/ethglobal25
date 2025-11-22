// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/lancer-protocol/FactoryContract.sol";

/**
 * @notice Deploy script for FactorylContract contract
 */
contract DeployFactoryContract is ScaffoldETHDeploy {
    function run() external returns (FactoryContract) {
        FactoryContract factory = new FactoryContract(deployer);
        return factory;
    }
}