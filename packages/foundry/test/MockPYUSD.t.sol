// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;


import "forge-std/Test.sol";
import "../contracts/mocks/MockPYUSD.sol";

contract MockPYUSDTest is Test {
    MockPYUSD token;

    function setUp() public {
        token = new MockPYUSD();
    }

    function testMintAndTransfer() public {
        token.mint(address(this), 100 * 1e6);
        token.transfer(address(0xBEEF), 25 * 1e6);
        assertEq(token.balanceOf(address(0xBEEF)), 25 * 1e6);
    }
}