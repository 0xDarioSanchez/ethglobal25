// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import {MockPYUSD} from "../contracts/mocks/MockPYUSD.sol";
import {MockAavePool} from "../contracts/mocks/MockAavePool.sol";
import {ProtocolContract} from "../contracts/lancer-protocol/ProtocolContract.sol";
import {FactoryContract} from "../contracts/lancer-protocol/FactoryContract.sol";
import {MarketplaceInstance} from "../contracts/lancer-protocol/MarketplaceInstance.sol";



// For running this script, use:
// forge script script/DeploySepolia.s.sol \
//   --rpc-url sepolia \
//   --broadcast \
//   --chain-id 11155111

contract DeploySepolia is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("SEPOLIA_DEPLOYER_KEY");
        uint256 payerKey = vm.envUint("SEPOLIA_PAYER_KEY");
        uint256 beneficiaryKey = vm.envUint("SEPOLIA_BENEFICIARY_KEY");
        uint256[5] memory judgeKeys = [
            vm.envUint("SEPOLIA_JUDGE1_KEY"),
            vm.envUint("SEPOLIA_JUDGE2_KEY"),
            vm.envUint("SEPOLIA_JUDGE3_KEY"),
            vm.envUint("SEPOLIA_JUDGE4_KEY"),
            vm.envUint("SEPOLIA_JUDGE5_KEY")
        ];

        address deployer = vm.addr(deployerKey);
        address payer = vm.addr(payerKey);
        address beneficiary = vm.addr(beneficiaryKey);
        address[5] memory judges;
        for (uint i; i < 5; i++) {
            judges[i] = vm.addr(judgeKeys[i]);
        }

        // ---------------------- DEPLOY CORE CONTRACTS ----------------------
        vm.startBroadcast(deployerKey);
        MockPYUSD pyusd = new MockPYUSD();
        MockAavePool aavePool = new MockAavePool();
        ProtocolContract protocol = new ProtocolContract(deployer, address(pyusd));
        FactoryContract factory = new FactoryContract(deployer);

        protocol.setFactoryAddress(address(factory));
        factory.setProtocolAddress(address(protocol));

        address marketplaceAddress = factory.createMarketplace(2, address(pyusd));
        MarketplaceInstance marketplace = MarketplaceInstance(marketplaceAddress);

        marketplace.setAavePool(address(aavePool));
        vm.stopBroadcast();

        // ---------------------- SETUP USERS ----------------------
        // Register users and mint tokens
        vm.startBroadcast(payerKey);
        marketplace.registerUser(true, false, false);
        pyusd.mint(payer, 1000 * 1e6);
        vm.stopBroadcast();

        vm.startBroadcast(beneficiaryKey);
        marketplace.registerUser(false, true, false);
        marketplace.createDeal(payer, 700 * 10**6, 2 weeks);
        vm.stopBroadcast();

        // ---------------------- REGISTER JUDGES ----------------------
        for (uint i; i < judges.length; i++) {
            vm.startBroadcast(judgeKeys[i]);
            protocol.registerAsJudge();
            vm.stopBroadcast();
        }

        // ---------------------- ACCEPT DEAL ----------------------
        vm.startBroadcast(payerKey);
        pyusd.approve(address(marketplace), type(uint256).max);
        marketplace.acceptDeal(1);
        vm.stopBroadcast();

        // ---------------------- CREATE DISPUTE ----------------------
        vm.startBroadcast(payerKey);
        marketplace.requestDispute(1, "The work was not delivered");
        vm.stopBroadcast();

        // ---------------------- REGISTER TO VOTE ----------------------
        for (uint i; i < judges.length; i++) {
            vm.startBroadcast(judgeKeys[i]);
            protocol.registerToVote(1);
            vm.stopBroadcast();
        }

        // ---------------------- CAST VOTES ----------------------
        for (uint i; i < judges.length; i++) {
            vm.startBroadcast(judgeKeys[i]);
            if (i < 4) {
                protocol.vote(1, false); // 3 for beneficiary
            } else {
                protocol.vote(1, true); // 2 for payer
            }
            vm.stopBroadcast();
        }

        bool isResolved = protocol.checkIfDisputeIsResolved(1);

        // ---------------------- APPLY DISPUTE RESULT ----------------------
        vm.startBroadcast(beneficiaryKey);
        marketplace.applyDisputeResult(1, 1);
        vm.stopBroadcast();

        // ---------------------- WITHDRAWALS ----------------------
        for (uint i; i < 4; i++) {
            vm.startBroadcast(judgeKeys[i]);
            protocol.judgeWithdraw();
            vm.stopBroadcast();
        }

        vm.startBroadcast(beneficiaryKey);
        marketplace.withdraw();
        vm.stopBroadcast();

        vm.startBroadcast(deployerKey);
        marketplace.withdrawFromAave();
        vm.stopBroadcast();

        // ---------------------- LOG OUTPUT ----------------------
        console.log("Deployer:", deployer);
        console.log("PYUSD:", address(pyusd));
        console.log("AavePool:", address(aavePool));
        console.log("ProtocolContract:", address(protocol));
        console.log("FactoryContract:", address(factory));
        console.log("MarketplaceInstance:", marketplaceAddress);
        console.log("Dispute resolved:", isResolved);
        console.log("Payer balance:", pyusd.balanceOf(payer) / 1e6);
        console.log("Beneficiary balance:", pyusd.balanceOf(beneficiary) / 1e6);
        console.log("Marketplace balance:", pyusd.balanceOf(marketplaceAddress) / 1e6);
        console.log("Protocol balance:", pyusd.balanceOf(address(protocol)) / 1e6);
        for (uint i; i < judges.length; i++) {
            console.log("Judge", i+1, "balance:", pyusd.balanceOf(judges[i]) / 1e6);
        }
    }
}