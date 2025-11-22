//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "../contracts/mocks/MockPYUSD.sol";

contract DeployMockPYUSD is Script {
    function run() external {

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        MockPYUSD token = new MockPYUSD();

        vm.stopBroadcast();

        console.log("MockPYUSD deployed at:", address(token));
    }
}