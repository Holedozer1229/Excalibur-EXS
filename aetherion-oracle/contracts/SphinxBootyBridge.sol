// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SphinxBootyBridge — zkStarknet proof gate; releases booty ETH to vault on valid claim.
contract SphinxBootyBridge {
    bytes32 public immutable expectedStateSig;
    address public immutable bootyVault;
    uint256 public immutable bootyAmountWei;

    mapping(bytes32 => bool) public claimedLocks;

    event BootyReleased(
        address indexed recipient,
        uint256 amount,
        bytes32 lockCommitment,
        uint256 nonce,
        bytes32 traceRoot
    );

    event BootyDeposited(address indexed from, uint256 amount, uint256 balanceAfter);

    constructor(bytes32 _stateSig, address _vault, uint256 _bootyWei) {
        expectedStateSig = _stateSig;
        bootyVault = _vault;
        bootyAmountWei = _bootyWei;
    }

    receive() external payable {
        emit BootyDeposited(msg.sender, msg.value, address(this).balance);
    }

    function depositBooty() external payable {
        require(msg.value > 0, "Sphinx: zero deposit");
        emit BootyDeposited(msg.sender, msg.value, address(this).balance);
    }

    function claimStarkProof(
        bytes32 lockCommitment,
        uint256 nonce,
        bytes32 stateSig,
        bytes32 traceRoot
    ) external payable returns (bool claimed) {
        require(stateSig == expectedStateSig, "Sphinx: invalid stateSig");
        require(!claimedLocks[lockCommitment], "Sphinx: already claimed");
        require(traceRoot != bytes32(0), "Sphinx: invalid traceRoot");
        claimedLocks[lockCommitment] = true;

        uint256 bal = address(this).balance;
        uint256 payout = bal > bootyAmountWei ? bootyAmountWei : bal;

        address recipient = bootyVault;
        if (payout > 0) {
            (bool ok, ) = recipient.call{value: payout}("");
            require(ok, "Sphinx: transfer failed");
        }

        emit BootyReleased(recipient, payout, lockCommitment, nonce, traceRoot);
        return true;
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
