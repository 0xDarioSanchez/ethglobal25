//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

// ====================================
//              IMPORTS          
// ====================================


import {MarketplaceInstance as Marketplace } from "./MarketplaceInstance.sol";
import "./interfaces/IFactory.sol";

// ====================================
//             INTERFACE          
// ====================================



// ====================================
//              CONTRACT          
// ====================================

/**
 * Smart contract with the main logic of Lancer Protocol
 * It also allows the owner to withdraw the Ether in the contract
 * @author 0xDarioSanchez
 */
contract FactoryContract is IFactory { 

    // ====================================
    //          STATE VARIABLES          
    // ====================================

    address public protocol;
    address public owner;

    mapping(address => bool) public isMarketplace;

    // ====================================
    //             MODIFIERS          
    // ====================================

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // ====================================
    //              EVENTS          
    // ====================================

    event MarketplaceDeployed(address indexed marketplace, address indexed creator);

    // ====================================
    //           CUSTOM ERRORs          
    // ====================================

    // ====================================
    //           CONSTRUCTOR          
    // ====================================

    constructor(address _owner) {
        owner = _owner;
    }

    // ====================================
    //         EXTERNAL FUNCTIONS          
    // ====================================


    /// Function to set the Protocol contract address, can only be called once and only by the owner
    /// @param _protocol is the address of the Protocol contract    
    function setProtocolAddress(address _protocol) external onlyOwner {
        require(protocol == address(0), "Protocol already set");
        require(_protocol != address(0), "Invalid address");
        protocol = _protocol;
    }


    /// Function to create a new marketplace, callable by anyone
    /// @param _feePercent is the fee percentage that the marketplace will take from each deal, it can be 0 to 100 (0% to 100%) and can be modified later
    /// @param _token indicates the token that will be used for payments in the marketplace, for production should be PYUSD address, but for fast testing I'm allowing any ERC20 or mock token
    function createMarketplace( uint8 _feePercent, address _token ) external returns (address) {
        Marketplace newMarketplace = new Marketplace(msg.sender, _feePercent, _token, protocol);
        isMarketplace[address(newMarketplace)] = true;

        emit MarketplaceDeployed(address(newMarketplace), msg.sender);
        return address(newMarketplace);
    }


    // ====================================
    //          PUBLIC FUNCTIONS          
    // ====================================



    // ====================================
    //        PURE & VIEW FUNCTIONS          
    // ====================================

    function isDeployedMarketplace(address _marketplace) external view returns (bool) {
        return isMarketplace[_marketplace];
    }

    // ====================================
    //              OTHERS          
    // ====================================

    //Function that allows the contract to receive ETH
    receive() external payable { }

}
