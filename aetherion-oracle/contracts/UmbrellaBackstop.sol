// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title UmbrellaBackstop
 * @notice Own-protocol liquidity backstop. CREATE2 via Arachnid factory.
 *
 * Payout hierarchy (only from balances this contract actually holds):
 *   1. Backstop ETH sitting on this address
 *   2. Reserve (vault) — recorded; cannot pull without the vault key
 *   3. Socialize the remainder as a deficit ledger — does not mint ETH
 *
 * Claims require a merkle leaf (beneficiary, amount) under an owner-filed root.
 * Only own documented leftover. 137 ETH is not minted. Bitcoin genesis is
 * never a beneficiary. No SELFDESTRUCT (EIP-6).
 *
 * Arachnid CREATE2 sets msg.sender to the factory — owner is an explicit arg.
 */
contract UmbrellaBackstop {
    address public owner;
    address public reserve;

    bytes32 public claimRoot;
    mapping(bytes32 => bool) public claimed;
    uint256 public socializedDeficitWei;
    uint256 public coveredWei;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event LiquidityInjected(address indexed from, uint256 amount);
    event Covered(address indexed to, uint256 amount, uint8 tier);
    event Claimed(bytes32 indexed leaf, address indexed to, uint256 amount);
    event RootFiled(bytes32 root);

    modifier onlyOwner() {
        require(msg.sender == owner, "owner");
        _;
    }

    constructor(address initialOwner, address reserve_) {
        require(initialOwner != address(0) && reserve_ != address(0), "zero");
        owner = initialOwner;
        reserve = reserve_;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    receive() external payable {
        emit LiquidityInjected(msg.sender, msg.value);
    }

    function fileClaimRoot(bytes32 root) external onlyOwner {
        claimRoot = root;
        emit RootFiled(root);
    }

    function transferOwnership(address next) external onlyOwner {
        require(next != address(0), "zero");
        emit OwnershipTransferred(owner, next);
        owner = next;
    }

    function verify(bytes32[] calldata proof, bytes32 leaf) public view returns (bool) {
        return claimRoot != bytes32(0) && _process(proof, leaf) == claimRoot;
    }

    function claimOwn(bytes32[] calldata proof, address to, uint256 amount) external {
        require(to != address(0), "to");
        bytes32 leaf = keccak256(abi.encodePacked(to, amount));
        require(!claimed[leaf], "claimed");
        require(verify(proof, leaf), "proof");
        claimed[leaf] = true;
        _cover(to, amount);
        emit Claimed(leaf, to, amount);
    }

    function injectAndCover(address to, uint256 amount) external payable onlyOwner {
        if (msg.value > 0) emit LiquidityInjected(msg.sender, msg.value);
        _cover(to, amount);
    }

    function _cover(address to, uint256 amount) internal {
        uint256 bal = address(this).balance;
        if (amount == 0) {
            emit Covered(to, 0, 3);
            return;
        }
        if (bal >= amount) {
            coveredWei += amount;
            (bool ok, ) = to.call{value: amount}("");
            require(ok, "pay");
            emit Covered(to, amount, 1);
            return;
        }
        if (bal > 0) {
            uint256 paid = bal;
            coveredWei += paid;
            (bool ok, ) = to.call{value: paid}("");
            require(ok, "pay");
            emit Covered(to, paid, 1);
            socializedDeficitWei += amount - paid;
            emit Covered(to, amount - paid, 3);
            return;
        }
        socializedDeficitWei += amount;
        emit Covered(to, 0, 3);
    }

    function _process(bytes32[] calldata proof, bytes32 leaf) internal pure returns (bytes32) {
        bytes32 h = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 p = proof[i];
            h = h < p ? keccak256(abi.encodePacked(h, p)) : keccak256(abi.encodePacked(p, h));
        }
        return h;
    }
}
