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

/**
 * @notice Main deployment script for all contracts
 * @dev Run this when you want to deploy multiple contracts at once
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        // ==========================================
        //            Load keys from .env
        // ==========================================
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        uint256 payerKey = vm.envUint("PAYER_KEY");
        uint256 beneficiaryKey = vm.envUint("BENEFICIARY_KEY");
        uint256[5] memory judgeKeys = [
            vm.envUint("JUDGE1_KEY"),
            vm.envUint("JUDGE2_KEY"),
            vm.envUint("JUDGE3_KEY"),
            vm.envUint("JUDGE4_KEY"),
            vm.envUint("JUDGE5_KEY")
        ];

        // ==========================================
        //     Derive addresses from private keys
        // ==========================================
        address deployer = vm.addr(deployerKey);
        address payer = vm.addr(payerKey);
        address beneficiary = vm.addr(beneficiaryKey);
        address[5] memory judges;
        for (uint i; i < 5; i++) {
            judges[i] = vm.addr(judgeKeys[i]);
        }

        // ==========================================
        //           Deploy core contracts
        // ==========================================
        vm.startBroadcast(deployerKey);

        MockPYUSD pyusd = new MockPYUSD();
        MockAavePool aavePool = new MockAavePool();
        ProtocolContract protocol = new ProtocolContract(deployer, address(pyusd));
        FactoryContract factory = new FactoryContract(deployer);

        // Set addresses in each other
        protocol.setFactoryAddress(address(factory));
        factory.setProtocolAddress(address(protocol));

        // Deploy marketplace
        address marketplaceAddress = factory.createMarketplace(2, address(pyusd));
        MarketplaceInstance marketplace = MarketplaceInstance(marketplaceAddress);

        marketplace.setAavePool(address(aavePool));

        vm.stopBroadcast();

        // ==========================================
        //             Payer registers
        // ==========================================
        vm.startBroadcast(payerKey);
        marketplace.registerUser(true, false, false);
        pyusd.mint(payer, 1000 * 1e6); // fund payer
        vm.stopBroadcast();

        // ==========================================
        //   Beneficiary registers and creates deal
        // ==========================================
        vm.startBroadcast(beneficiaryKey);
        marketplace.registerUser(false, true, false);
        marketplace.createDeal(payer, 700 * 10**6, 2 weeks);
        vm.stopBroadcast();

        // ==========================================
        //         Judges register as judges
        // ==========================================
        for (uint i; i < judges.length; i++) {
            vm.startBroadcast(judgeKeys[i]);
            protocol.registerAsJudge();
            vm.stopBroadcast();
        }


        // ==========================================
        //       Payer accepts deal
        // ==========================================
        vm.startBroadcast(payerKey);
        pyusd.approve(address(marketplace), type(uint256).max);
        marketplace.acceptDeal(1);
        vm.stopBroadcast();

        // ==========================================
        //          Payer requests a dispute
        // ==========================================
        vm.startBroadcast(payerKey);
        marketplace.requestDispute(1, "The work was not delivered");
        vm.stopBroadcast();

        // ==========================================
        //           Judges register to vote        
        // ==========================================
        for (uint i; i < judges.length; i++) {
            vm.startBroadcast(judgeKeys[i]);
            protocol.registerToVote(1);
            vm.stopBroadcast();
        }

        // ==========================================
        //               Judges vote
        // ==========================================
        for (uint i; i < judges.length; i++) {
            vm.startBroadcast(judgeKeys[i]);
            if (i < 4) {                    // 3 judges vote for beneficiary, 2 for requester
                protocol.vote(1, false);    // Vote for beneficiary
            } else {
                protocol.vote(1, true);     // Vote for requester
            }
            vm.stopBroadcast();
        }

        // ==========================================
        //        Check if dispute is resolved
        // ==========================================
        bool isResolved = protocol.checkIfDisputeIsResolved(1);

        // ==========================================
        //       Execute dispute result
        // ==========================================

        vm.startBroadcast(beneficiaryKey);
        marketplace.applyDisputeResult(1, 1);
        vm.stopBroadcast();

        // ==========================================
        //           Judges withdraw fees
        // ==========================================
        vm.startBroadcast(judgeKeys[0]);
        protocol.judgeWithdraw();
        vm.stopBroadcast();
        vm.startBroadcast(judgeKeys[1]);
        protocol.judgeWithdraw();
        vm.stopBroadcast();
        vm.startBroadcast(judgeKeys[2]);
        protocol.judgeWithdraw();
        vm.stopBroadcast();
        vm.startBroadcast(judgeKeys[3]);
        protocol.judgeWithdraw();
        vm.stopBroadcast();

        // ==========================================
        //       Beneficiary withdraws funds
        // ==========================================
        vm.startBroadcast(beneficiaryKey);
        marketplace.withdraw();
        vm.stopBroadcast();


        // ==========================================
        //       Market owner withdraws funds
        // ==========================================
        vm.startBroadcast(deployerKey);
        marketplace.withdrawFromAave();
        vm.stopBroadcast();

        // ==========================================
        //         Check final balances
        // ==========================================
        console.log("Protocol factory:", protocol.factory());
        console.log("Factory protocol:", factory.protocol());
        console.log("Marketplace address:", marketplaceAddress);
        
        console.log("Dispute resolved:", isResolved);

        console.log("Payer PYUSD balance:", pyusd.balanceOf(payer) / 1e6, "Initially 1000, paid 700 for deal and 50 for dispute");
        console.log("Beneficiary PYUSD balance:", pyusd.balanceOf(beneficiary) / 1e6);
        console.log("Marketplace PYUSD balance:", pyusd.balanceOf(marketplaceAddress) / 1e6);
        console.log("Protocol PYUSD balance:", pyusd.balanceOf(address(protocol)) / 1e6);
        console.log("Judge 1 PYUSD balance:", pyusd.balanceOf(judges[0]) / 1e6);
        console.log("Judge 2 PYUSD balance:", pyusd.balanceOf(judges[1]) / 1e6);
        console.log("Judge 3 PYUSD balance:", pyusd.balanceOf(judges[2]) / 1e6);
        console.log("Judge 4 PYUSD balance:", pyusd.balanceOf(judges[3]) / 1e6);
        console.log("Judge 5 PYUSD balance:", pyusd.balanceOf(judges[4]) / 1e6);
    }
}
