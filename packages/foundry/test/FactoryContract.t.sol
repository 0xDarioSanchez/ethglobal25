// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../contracts/lancer-protocol/FactoryContract.sol";
import "../contracts/lancer-protocol/MarketplaceInstance.sol";

contract FactoryContractTest is Test {
    FactoryContract factory;
    address owner = address(0xA11CE);
    address protocol = address(0xBEEF);
    address user = address(0xCAFE);
    address token = address(0xDEAD);

    event MarketplaceDeployed(address indexed marketplace, address indexed creator);


    function setUp() public {
        vm.startPrank(owner);
        factory = new FactoryContract(owner);
        vm.stopPrank();
    }


    function test_SetProtocolAddress_Works() public {
        vm.prank(owner);
        factory.setProtocolAddress(protocol);

        vm.prank(owner);
        vm.expectRevert("Protocol already set");
        factory.setProtocolAddress(protocol);
    }

    function test_SetProtocolAddress_RevertIfNotOwner() public {
        vm.prank(user);
        vm.expectRevert("Only owner can call this function");
        factory.setProtocolAddress(protocol);
    }

    function test_SetProtocolAddress_RevertIfInvalid() public {
        vm.prank(owner);
        vm.expectRevert("Invalid address");
        factory.setProtocolAddress(address(0));
    }

    function test_CreateMarketplace_Works() public {
        vm.prank(owner);
        factory.setProtocolAddress(protocol);

        vm.expectEmit(false, true, false, true, address(factory));
        emit MarketplaceDeployed(address(0), user);
        
        // User creates marketplace
        vm.prank(user);
        address newMarketplace = factory.createMarketplace(5, token);

        // Check that marketplace is tracked
        bool isDeployed = factory.isDeployedMarketplace(newMarketplace);
        assertTrue(isDeployed, "Marketplace should be marked as deployed");
    }

    function test_CreateMarketplace_CreatesUniqueAddresses() public {
        vm.prank(owner);
        factory.setProtocolAddress(protocol);

        vm.prank(user);
        address market1 = factory.createMarketplace(5, token);

        vm.prank(user);
        address market2 = factory.createMarketplace(10, token);

        assertTrue(market1 != market2, "Each deployment must have unique address");
    }

    function test_IsDeployedMarketplace_FalseForUnknown() public view {
        assertFalse(factory.isMarketplace(address(0x1234)), "Should return false for unknown address");
    }

    function test_ReceiveETH_DoesNotRevert() public {
        // Just send ETH to the contract
        (bool ok, ) = address(factory).call{value: 1 ether}("");
        assertTrue(ok, "Should accept ETH via receive()");
    }
}