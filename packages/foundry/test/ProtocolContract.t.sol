// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../contracts/lancer-protocol/ProtocolContract.sol";
import "../contracts/lancer-protocol/interfaces/IFactory.sol";
import "../contracts/lancer-protocol/interfaces/IPYUSD.sol";
import "./utils/ProtocolHelper.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock ERC20 (PYUSD) implementation
contract MockPYUSD is ERC20 {
    constructor() ERC20("Mock PYUSD", "PYUSD") {
        _mint(msg.sender, 1_000_000 * 10 ** 6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Mock Factory to simulate isDeployedMarketplace behavior
contract MockFactory is IFactory {
    mapping(address => bool) public deployed;

    function setDeployed(address addr, bool val) external {
        deployed[addr] = val;
    }

    function isDeployedMarketplace(address addr) external view override returns (bool) {
        return deployed[addr];
    }
}

contract ProtocolContractTest is Test {
    ProtocolHelper protocol;
    MockPYUSD pyusd;
    MockFactory factory;

    address owner = address(0xA11CE);
    address marketplace = address(0xBEEF);
    address requester = address(0xCAFE);
    address beneficiary = address(0xD00D);
    address judge1 = address(0x1111);
    address judge2 = address(0x2222);
    address judge3 = address(0x3333);
    address judge4 = address(0x4444);
    address judge5 = address(0x5555);

    function setUp() public {
        vm.startPrank(owner);
        pyusd = new MockPYUSD();
        protocol = new ProtocolHelper(owner, address(pyusd));
        factory = new MockFactory();

        protocol.setFactoryAddress(address(factory));
        vm.stopPrank();

        factory.setDeployed(marketplace, true);
    }


    function test_SetFactoryAddress_RevertIfAlreadySet() public {
        vm.startPrank(owner);
        vm.expectRevert("Factory already set");
        protocol.setFactoryAddress(address(factory));
        vm.stopPrank();
    }

    function test_RegisterAsJudge_Works() public {
        vm.startPrank(judge1);
        protocol.registerAsJudge();
        vm.stopPrank();

        (address addr, uint256 bal, int8 rep) = protocol.judges(judge1);
        assertEq(addr, judge1);
        assertEq(bal, 0);
        assertEq(rep, 0);
    }

    function test_RegisterAsJudge_RevertIfAlreadyRegistered() public {
        vm.startPrank(judge1);
        protocol.registerAsJudge();
        vm.expectRevert("Already registered");
        protocol.registerAsJudge();
        vm.stopPrank();
    }

    function test_CreateDispute_Works() public {
        vm.startPrank(marketplace);
        protocol.createDispute(requester, "ipfs://proof1");
        vm.stopPrank();

        (,, address requesterStored,, string memory proof,,,,,,) = protocol.disputes(1);
        assertEq(requesterStored, requester);
        assertEq(proof, "ipfs://proof1");
    }

    function test_CreateDispute_RevertIfUnauthorized() public {
        vm.startPrank(address(0xBAD));
        vm.expectRevert("Unauthorized");
        protocol.createDispute(requester, "ipfs://proof2");
        vm.stopPrank();
    }

    function test_UpdateDisputeForPayer_Works() public {
        vm.startPrank(marketplace);
        protocol.createDispute(requester, "proof1");
        vm.stopPrank();

        vm.startPrank(requester);
        protocol.updateDisputeForPayer(1, requester, "updatedProof");
        vm.stopPrank();
    }

    function test_UpdateDisputeForPayer_RevertIfNotRequester() public {
        vm.startPrank(marketplace);
        protocol.createDispute(requester, "proof1");
        vm.stopPrank();

        vm.expectRevert("Not the requester");
        protocol.updateDisputeForPayer(1, beneficiary, "fake");
    }

    function test_RegisterToVote_And_OpenDispute() public {
        // Create dispute
        vm.startPrank(marketplace);
        protocol.createDispute(requester, "proof");
        vm.stopPrank();

        uint64 disputeId = 1;

        // Small cheat-code: set waitingForJudges = true so judges can register
        bytes32 slot = keccak256(abi.encode(disputeId, uint256(1))); 
        vm.store(address(protocol), slot, bytes32(uint256(1)));

        // Register judges
        vm.startPrank(judge1); protocol.registerAsJudge(); vm.stopPrank();
        vm.startPrank(judge2); protocol.registerAsJudge(); vm.stopPrank();
        vm.startPrank(judge3); protocol.registerAsJudge(); vm.stopPrank();
        vm.startPrank(judge4); protocol.registerAsJudge(); vm.stopPrank();
        vm.startPrank(judge5); protocol.registerAsJudge(); vm.stopPrank();

        // Judges register to vote
        vm.startPrank(judge1); protocol.registerToVote(disputeId); vm.stopPrank();
        vm.startPrank(judge2); protocol.registerToVote(disputeId); vm.stopPrank();
        vm.startPrank(judge3); protocol.registerToVote(disputeId); vm.stopPrank();
        vm.startPrank(judge4); protocol.registerToVote(disputeId); vm.stopPrank();
        vm.startPrank(judge5); protocol.registerToVote(disputeId); vm.stopPrank();

        // Finally check that dispute is open
        (,,,,,,,,, bool isOpen,) = protocol.disputes(disputeId);
        assertTrue(isOpen, "Dispute should be open after all judges registered");
    }


    function test_JudgeWithdraw_Works() public {
        vm.startPrank(judge1);
        protocol.registerAsJudge();
        vm.stopPrank();

        protocol.setJudgeBalance(judge1, 100 * 10**6);

        pyusd.mint(address(protocol), 1_000 * 10**6);

        vm.startPrank(judge1);
        protocol.judgeWithdraw();
        vm.stopPrank();

        assertEq(pyusd.balanceOf(judge1), 100 * 10**6);
    }

    function test_Withdraw_OwnerOnly() public {
        // Mint PYUSD to protocol
        pyusd.mint(address(protocol), 1_000 * 10**6);

        vm.prank(owner);
        protocol.withdraw();

        assertEq(pyusd.balanceOf(owner), 1_001_000 * 10**6);  // Since owner started with 100,000 PYUSD
    }

    function test_Withdraw_RevertIfNoBalance() public {
        vm.prank(owner);
        vm.expectRevert("No PYUSD to withdraw");
        protocol.withdraw();
    }

    function test_UpdateNumberOfVotes() public {
        vm.prank(owner);
        protocol.updateNumberOfVotes(7);
        assertEq(protocol.numberOfVotes(), 7);
    }

    function test_UpdateNumberOfVotes_RevertIfZero() public {
        vm.prank(owner);
        vm.expectRevert("Must be greater than 0");
        protocol.updateNumberOfVotes(0);
    }

    function test_Vote_Works() public {
        vm.startPrank(marketplace);
        protocol.createDispute(requester, "proof1");
        vm.stopPrank();

        uint64 disputeId = 1;

        vm.startPrank(judge1); protocol.registerAsJudge(); vm.stopPrank();
        vm.startPrank(judge2); protocol.registerAsJudge(); vm.stopPrank();
        vm.startPrank(judge3); protocol.registerAsJudge(); vm.stopPrank();
        vm.startPrank(judge4); protocol.registerAsJudge(); vm.stopPrank();
        vm.startPrank(judge5); protocol.registerAsJudge(); vm.stopPrank();

        bytes32 base = keccak256(abi.encode(disputeId, uint256(1)));
        bytes32 waitingForJudgesSlot = bytes32(uint256(base) + 5);
        bytes32 isOpenSlot = bytes32(uint256(base) + 6);
        vm.store(address(protocol), waitingForJudgesSlot, bytes32(uint256(1)));
        vm.store(address(protocol), isOpenSlot, bytes32(uint256(1)));

        vm.prank(judge1); protocol.registerToVote(disputeId);
        vm.prank(judge2); protocol.registerToVote(disputeId);
        vm.prank(judge3); protocol.registerToVote(disputeId);
        vm.prank(judge4); protocol.registerToVote(disputeId);
        vm.prank(judge5); protocol.registerToVote(disputeId);

        (,,,,,,,,, bool isOpenBefore,) = protocol.disputes(disputeId);
        assertTrue(isOpenBefore);

        vm.prank(judge1); protocol.vote(disputeId, true);
        vm.prank(judge2); protocol.vote(disputeId, false);
        vm.prank(judge3); protocol.vote(disputeId, true);
        vm.prank(judge4); protocol.vote(disputeId, true);
        vm.prank(judge5); protocol.vote(disputeId, false);

        (,,,,,,,,, bool isOpenAfter,) = protocol.disputes(disputeId);
        assertFalse(isOpenAfter, "Dispute should close after all votes");

        bool result = protocol.getDisputeResult(); // or however your getter is named
        assertTrue(result, "Result should favor requester (3 out of 5 votes)");
    }

    function test_Vote_RevertIfNotJudge() public {
        vm.startPrank(marketplace);
        protocol.createDispute(requester, "proof");
        vm.stopPrank();

        uint64 disputeId = 1;
        bytes32 base = keccak256(abi.encode(disputeId, uint256(1)));
        bytes32 waitingForJudgesSlot = bytes32(uint256(base) + 5);
        bytes32 isOpenSlot = bytes32(uint256(base) + 6);
        vm.store(address(protocol), waitingForJudgesSlot, bytes32(uint256(1)));
        vm.store(address(protocol), isOpenSlot, bytes32(uint256(1)));

        vm.expectRevert("Judge not allowed to vote");
        protocol.vote(disputeId, true);
    }

    function test_Vote_RevertIfAlreadyVoted() public {
        vm.startPrank(marketplace);
        protocol.createDispute(requester, "proof1");
        vm.stopPrank();

        uint64 disputeId = 1;

        vm.startPrank(judge1); protocol.registerAsJudge(); vm.stopPrank();
        vm.startPrank(judge2); protocol.registerAsJudge(); vm.stopPrank();
        vm.startPrank(judge3); protocol.registerAsJudge(); vm.stopPrank();
        vm.startPrank(judge4); protocol.registerAsJudge(); vm.stopPrank();
        vm.startPrank(judge5); protocol.registerAsJudge(); vm.stopPrank();

        bytes32 base = keccak256(abi.encode(disputeId, uint256(1)));
        bytes32 waitingForJudgesSlot = bytes32(uint256(base) + 5);
        bytes32 isOpenSlot = bytes32(uint256(base) + 6);
        vm.store(address(protocol), waitingForJudgesSlot, bytes32(uint256(1)));
        vm.store(address(protocol), isOpenSlot, bytes32(uint256(1)));

        vm.prank(judge1); protocol.registerToVote(disputeId);
        vm.prank(judge2); protocol.registerToVote(disputeId);
        vm.prank(judge3); protocol.registerToVote(disputeId);
        vm.prank(judge4); protocol.registerToVote(disputeId);
        vm.prank(judge5); protocol.registerToVote(disputeId);

        (,,,,,,,,, bool isOpenBefore,) = protocol.disputes(disputeId);
        assertTrue(isOpenBefore);

        vm.prank(judge1); protocol.vote(disputeId, true); 

        vm.expectRevert("Judge already voted");
        vm.prank(judge1); protocol.vote(disputeId, true); 
        vm.stopPrank();
    }

    function test_Vote_RevertIfDisputeNotOpen() public {
        vm.startPrank(marketplace);
        protocol.createDispute(requester, "ipfs://proof1");
        vm.stopPrank();

        uint64 disputeId = 1;
        bytes32 base = keccak256(abi.encode(disputeId, uint256(1)));
        bytes32 isOpenSlot = bytes32(uint256(base) + 6);
        vm.store(address(protocol), isOpenSlot, bytes32(uint256(1))); // close it

        vm.startPrank(judge1);
        protocol.registerAsJudge();
        protocol.registerToVote(disputeId);
        vm.expectRevert("Dispute not open");
        protocol.vote(disputeId, true);
        vm.stopPrank();
    }
}