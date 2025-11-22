// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockAavePool {
    event Supplied(address asset, uint256 amount, address onBehalfOf);
    event Withdrawn(address asset, uint256 amount, address to);

    mapping(address => uint256) public balances;

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        balances[onBehalfOf] += amount;
        emit Supplied(asset, amount, onBehalfOf);
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        uint256 balance = balances[msg.sender];
        if (amount > balance) amount = balance;
        balances[msg.sender] -= amount;
        IERC20(asset).transfer(to, amount);
        emit Withdrawn(asset, amount, to);
        return amount;
    }
}