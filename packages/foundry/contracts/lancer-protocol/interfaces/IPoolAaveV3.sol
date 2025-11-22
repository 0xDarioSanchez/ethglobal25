// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

interface IPoolAaveV3 {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}