//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/lancer-protocol/ProtocolContract.sol";
import "../contracts/lancer-protocol/FactoryContract.sol";
import { MarketplaceInstance } from "../contracts/lancer-protocol/MarketplaceInstance.sol";
import "../contracts/mocks/MockPYUSD.sol";
import "../contracts/mocks/MockAavePool.sol";
import "forge-std/Script.sol";
import "forge-std/console.sol";

contract DeploySepolia is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("SEPOLIA_DEPLOYER_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // Deploy core contracts
        MockPYUSD pyusd = new MockPYUSD();
        ProtocolContract protocol = new ProtocolContract(deployer, address(pyusd));
        FactoryContract factory = new FactoryContract(deployer);
        MockAavePool aavePool = new MockAavePool();

        // Link factory ↔ protocol
        protocol.setFactoryAddress(address(factory));
        factory.setProtocolAddress(address(protocol));

        // Create the first marketplace (optional)
        address marketplaceAddress = factory.createMarketplace(2, address(pyusd));

        vm.stopBroadcast();

        // Log addresses
        console.log("Deployer:", deployer);
        console.log("PYUSD:", address(pyusd));
        console.log("AavePool:", address(aavePool));
        console.log("ProtocolContract:", address(protocol));
        console.log("FactoryContract:", address(factory));
        console.log("MarketplaceInstance:", marketplaceAddress);
    }
}