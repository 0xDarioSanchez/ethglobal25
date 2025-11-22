//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

interface IFactory {
    function isDeployedMarketplace(address) external view returns (bool);
}