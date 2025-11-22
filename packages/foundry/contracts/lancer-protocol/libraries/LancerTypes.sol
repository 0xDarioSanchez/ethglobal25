//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

library LancerTypes {
    
    struct Deal {
        address payer;
        address receiver;
        uint256 amount;
        uint256 createdAt;
        bool accepted;
        bool disputed;
    }
}