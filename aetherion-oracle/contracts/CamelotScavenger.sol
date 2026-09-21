// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CamelotScavenger
 * @notice ERC-20 (Camelot Excalibur / EXCAL). CREATE2 via Arachnid factory,
 *         salt 0x7c2bac1d padded to 32 bytes.
 *
 * Deploy notes (do not mint to the factory):
 *   Arachnid CREATE2 sets msg.sender to the factory during init.
 *   Ownable/genesis mint MUST take an explicit initialOwner.
 *   BIP-322 is not OpenZeppelin ECDSA.recover — constructor does not
 *   require that pairing (it would revert and leave the address empty).
 *
 * Bitcoin genesis 1A1zP1… is attestation-only. Never a sweep target.
 * 137 ETH is not minted here.
 */
contract CamelotScavenger {
    string public constant name = "Camelot Excalibur";
    string public constant symbol = "EXCAL";
    uint8 public constant decimals = 18;

    bytes public constant GENESIS_PUBKEY =
        hex"03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6";

    string public constant GENESIS_MESSAGE =
        "Address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa\n"
        "Statement: I assert control of Bitcoin address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa.\n"
        "Date (UTC): 2025-08-26T00:00:00Z\n"
        "Nonce: 7c2bac1d\n"
        "\n"
        "Message:\n"
        "Aiamsatoshi20250826\n"
        "Abcdeghijklmnopqrstuvwxyz0123456789\n";

    bytes public constant GENESIS_SIGNATURE =
        hex"1fdad93159a7977c32132b7a009f12407090f959f5e766e427c1d85d85a4701eb8108cc06e4139d250200dad7493656d2b3022a0b24e3e8dd66a524ad807b3b38d";

    bytes32 public constant MNEMONIC_HASH =
        keccak256(bytes("sword legend pull magic king arthur stone destiny forge fire steel honor quest"));

    uint256 public constant TOTAL_SUPPLY = 29_000_000 * 10 ** 18;
    uint256 public constant GENESIS_MINT = 7_500_000 * 10 ** 18;
    uint256 public constant REMAINING_MINT = TOTAL_SUPPLY - GENESIS_MINT;
    uint256 public constant PER_SOLVER_MINT = 1000 * 10 ** 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public owner;
    uint256 public mintedBySolvers;
    mapping(address => bool) public hasMinted;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SolverMinted(address indexed solver, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    constructor(address initialOwner) {
        require(initialOwner != address(0), "owner");
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
        _mint(initialOwner, GENESIS_MINT);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "ERC20: insufficient allowance");
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - value;
        _transfer(from, to, value);
        return true;
    }

    function mintByMnemonic(string calldata mnemonic) external {
        require(!hasMinted[msg.sender], "Already minted");
        require(keccak256(bytes(mnemonic)) == MNEMONIC_HASH, "Wrong mnemonic");
        uint256 toMint = PER_SOLVER_MINT;
        require(mintedBySolvers + toMint <= REMAINING_MINT, "Pool exhausted");
        _mint(msg.sender, toMint);
        mintedBySolvers += toMint;
        hasMinted[msg.sender] = true;
        emit SolverMinted(msg.sender, toMint);
    }

    function withdrawRemaining() external onlyOwner {
        uint256 left = REMAINING_MINT - mintedBySolvers;
        require(left > 0, "No remaining tokens");
        _mint(owner, left);
    }

    function genesisMessageHash() public pure returns (bytes32) {
        return keccak256(bytes(GENESIS_MESSAGE));
    }

    function expectedGenesisAddress() public pure returns (address) {
        return address(uint160(uint256(keccak256(GENESIS_PUBKEY))));
    }

    function getGenesisAttestation()
        external
        pure
        returns (
            bytes memory pubkey,
            bytes memory sig,
            string memory message,
            bytes32 msgHash,
            address expectedAddr
        )
    {
        return (
            GENESIS_PUBKEY,
            GENESIS_SIGNATURE,
            GENESIS_MESSAGE,
            keccak256(bytes(GENESIS_MESSAGE)),
            address(uint160(uint256(keccak256(GENESIS_PUBKEY))))
        );
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "ERC20: to zero");
        uint256 bal = balanceOf[from];
        require(bal >= value, "ERC20: insufficient balance");
        unchecked {
            balanceOf[from] = bal - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) internal {
        require(to != address(0), "ERC20: mint zero");
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
}
