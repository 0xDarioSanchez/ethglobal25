// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../contracts/lancer-protocol/MarketplaceInstance.sol";
import "../contracts/mocks/MockProtocol.sol";
import "../contracts/mocks/MockPYUSD.sol";
import "../contracts/mocks/MockAavePool.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract MarketplaceInstanceTest is Test {
    MarketplaceInstance marketplace;
    MockPYUSD pyusd;
    MockProtocol protocol;

    address owner = address(0xABCD);
    address payer = address(0x123);
    address beneficiary = address(0x456);

    function setUp() public {
        // Deploy mocks
        pyusd = new MockPYUSD();
        protocol = new MockProtocol();
        MockAavePool mockPool = new MockAavePool();

        // Mint tokens
        pyusd.mint(payer, 10_000 ether);
        pyusd.mint(beneficiary, 10_000 ether);

        // Deploy marketplace
        marketplace = new MarketplaceInstance(
            owner,
            2, // feePercent, it can be modified later
            address(pyusd),
            address(protocol)
        );


        vm.startPrank(owner);
        marketplace.setAavePool(address(mockPool));
        vm.stopPrank();
        

        vm.startPrank(owner);
        marketplace.registerUser(false, true, false); // owner as beneficiary
        vm.stopPrank();

        vm.startPrank(payer);
        marketplace.registerUser(true, false, false);
        pyusd.approve(address(marketplace), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(beneficiary);
        marketplace.registerUser(false, true, false);
        pyusd.approve(address(marketplace), type(uint256).max);
        vm.stopPrank();
    }


    function test_UserRegistration() public view {
        (
            address userAddress,
            uint256 balance,
            ,
            ,
            bool isPayer,
            ,
            bool isJudge
        ) = marketplace.users(payer);

        assertEq(userAddress, payer);
        assertTrue(isPayer);
        assertFalse(isJudge);
        assertEq(balance, 0);
    }


    function test_CreateDeal() public {
        vm.startPrank(beneficiary);
        marketplace.createDeal(payer, 100 ether, 7);
        vm.stopPrank();

        (,address storedPayer, address storedBeneficiary, uint256 amount,,,,) = marketplace.deals(1);
        assertEq(storedPayer, payer);
        assertEq(storedBeneficiary, beneficiary);
        assertEq(amount, 100 ether);
    }


    function test_UpdateDealAmount() public {
        vm.startPrank(beneficiary);
        marketplace.createDeal(payer, 100 ether, 7);
        vm.stopPrank();

        vm.startPrank(payer);
        marketplace.updateDealAmount(1, 200 ether);
        vm.stopPrank();

        (,,,uint256 newAmount,,,,) = marketplace.deals(1);
        assertEq(newAmount, 200 ether);
    }


    function test_AcceptDeal() public {
        vm.startPrank(beneficiary);
        marketplace.createDeal(payer, 50 ether, 3);
        vm.stopPrank();

        vm.startPrank(payer);
        marketplace.acceptDeal(1);
        vm.stopPrank();

        (,,,,,,bool accepted,) = marketplace.deals(1);
        assertTrue(accepted);
    }


    function test_FinishDeal() public {
        vm.startPrank(beneficiary);
        marketplace.createDeal(payer, 100 ether, 3);
        vm.stopPrank();

        vm.startPrank(payer);
        marketplace.acceptDeal(1);
        marketplace.finishDeal(1);
        vm.stopPrank();

        (,uint256 newBalance,,,,,) = marketplace.users(beneficiary);

        assertEq(newBalance, 98 ether); // 2% fee applied
    }


    function test_RequestDispute() public {
        vm.startPrank(beneficiary);
        marketplace.createDeal(payer, 100 ether, 3);
        vm.stopPrank();

        vm.startPrank(payer);
        pyusd.approve(address(marketplace), type(uint256).max);
        marketplace.acceptDeal(1);
        protocol.createDispute(msg.sender);
        vm.stopPrank();
    }


    function test_WithdrawBalance() public {
        vm.startPrank(beneficiary);
        marketplace.createDeal(payer, 100 ether, 3);
        vm.stopPrank();

        vm.startPrank(payer);
        marketplace.acceptDeal(1);
        marketplace.finishDeal(1);
        vm.stopPrank();

        vm.startPrank(beneficiary);
        marketplace.withdraw();
        vm.stopPrank();

        assertEq(pyusd.balanceOf(beneficiary), 10_098 ether); // original 10k + 98 earned
    }
}
