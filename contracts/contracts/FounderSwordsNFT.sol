// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FounderSwordsNFT
 * @dev 13 Unique Founder Sword NFTs with perpetual revenue sharing
 * 
 * Each NFT grants:
 * - 1-2% of ALL forge fees in perpetuity (automatically distributed)
 * - 50,000 EXS token allocation
 * - Governance veto power
 * - Physical titanium sword + annual Round Table summit
 * - Priority access to all future projects
 * 
 * Revenue Share Distribution:
 * - Sword 0 (Excalibur): 2% of all forge fees
 * - Swords 1-3: 1.5% each
 * - Swords 4-12: 1% each
 */
contract FounderSwordsNFT is 
    ERC721, 
    ERC721URIStorage, 
    ERC721Burnable, 
    Pausable, 
    AccessControl,
    ReentrancyGuard 
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REVENUE_DISTRIBUTOR_ROLE = keccak256("REVENUE_DISTRIBUTOR_ROLE");

    uint256 public constant MAX_SUPPLY = 13;
    uint256 public constant EXS_ALLOCATION_PER_SWORD = 50_000 * 10**18;

    struct SwordMetadata {
        string name;
        uint256 revenueShareBasisPoints; // 100 basis points = 1%
        uint256 totalRevenueReceived;
        bool hasGovernanceVeto;
    }

    mapping(uint256 => SwordMetadata) public swordMetadata;
    mapping(uint256 => uint256) public pendingRevenue;
    
    uint256 public totalForgeFees;
    uint256 public totalRevenueDistributed;
    uint256 private _nextTokenId;

    event SwordMinted(uint256 indexed tokenId, address indexed owner, string name, uint256 revenueShare);
    event RevenueDeposited(uint256 amount, uint256 totalFees);
    event RevenueDistributed(uint256 indexed tokenId, address indexed owner, uint256 amount);
    event RevenueClaimed(uint256 indexed tokenId, address indexed owner, uint256 amount);

    constructor() ERC721("Excalibur Founder Swords", "EXSWORD") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(REVENUE_DISTRIBUTOR_ROLE, msg.sender);

        // Initialize sword metadata
        _initializeSwordMetadata();
    }

    /**
     * @dev Initializes metadata for all 13 swords
     */
    function _initializeSwordMetadata() internal {
        // Sword 0: Excalibur (2%)
        swordMetadata[0] = SwordMetadata({
            name: "Excalibur",
            revenueShareBasisPoints: 200, // 2%
            totalRevenueReceived: 0,
            hasGovernanceVeto: true
        });

        // Swords 1-3 (1.5% each)
        string[3] memory tier1Names = ["Caliburn", "Clarent", "Carnwennan"];
        for (uint256 i = 1; i <= 3; i++) {
            swordMetadata[i] = SwordMetadata({
                name: tier1Names[i - 1],
                revenueShareBasisPoints: 150, // 1.5%
                totalRevenueReceived: 0,
                hasGovernanceVeto: true
            });
        }

        // Swords 4-12 (1% each)
        string[9] memory tier2Names = [
            "Joyeuse",
            "Durendal",
            "Curtana",
            "Tizona",
            "Colada",
            "Almace",
            "Hauteclere",
            "Balmung",
            "Gram"
        ];
        for (uint256 i = 4; i <= 12; i++) {
            swordMetadata[i] = SwordMetadata({
                name: tier2Names[i - 4],
                revenueShareBasisPoints: 100, // 1%
                totalRevenueReceived: 0,
                hasGovernanceVeto: false
            });
        }
    }

    /**
     * @dev Mints a Founder Sword NFT
     * @param to Address to receive the NFT
     * @param tokenId Token ID (0-12)
     * @param tokenURI URI for the token metadata
     */
    function mintSword(
        address to,
        uint256 tokenId,
        string memory tokenURI
    ) external onlyRole(MINTER_ROLE) {
        require(tokenId < MAX_SUPPLY, "Invalid token ID");
        require(_ownerOf(tokenId) == address(0), "Sword already minted");

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit SwordMinted(
            tokenId,
            to,
            swordMetadata[tokenId].name,
            swordMetadata[tokenId].revenueShareBasisPoints
        );
    }

    /**
     * @dev Deposits forge fees for revenue distribution
     */
    function depositForgeFees() external payable onlyRole(REVENUE_DISTRIBUTOR_ROLE) {
        require(msg.value > 0, "No fees to deposit");
        
        totalForgeFees += msg.value;
        
        // Distribute revenue to all minted swords
        for (uint256 i = 0; i < MAX_SUPPLY; i++) {
            if (_ownerOf(i) != address(0)) {
                uint256 share = (msg.value * swordMetadata[i].revenueShareBasisPoints) / 10000;
                pendingRevenue[i] += share;
                swordMetadata[i].totalRevenueReceived += share;
                totalRevenueDistributed += share;
                
                emit RevenueDistributed(i, _ownerOf(i), share);
            }
        }

        emit RevenueDeposited(msg.value, totalForgeFees);
    }

    /**
     * @dev Claims pending revenue for a sword
     * @param tokenId Token ID of the sword
     */
    function claimRevenue(uint256 tokenId) external nonReentrant {
        require(_ownerOf(tokenId) == msg.sender, "Not the owner");
        require(pendingRevenue[tokenId] > 0, "No revenue to claim");

        uint256 amount = pendingRevenue[tokenId];
        pendingRevenue[tokenId] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit RevenueClaimed(tokenId, msg.sender, amount);
    }

    /**
     * @dev Claims revenue for multiple swords
     * @param tokenIds Array of token IDs
     */
    function claimMultipleRevenue(uint256[] calldata tokenIds) external nonReentrant {
        uint256 totalAmount = 0;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(_ownerOf(tokenId) == msg.sender, "Not the owner");
            
            uint256 amount = pendingRevenue[tokenId];
            if (amount > 0) {
                pendingRevenue[tokenId] = 0;
                totalAmount += amount;
                emit RevenueClaimed(tokenId, msg.sender, amount);
            }
        }

        require(totalAmount > 0, "No revenue to claim");

        (bool success, ) = payable(msg.sender).call{value: totalAmount}("");
        require(success, "Transfer failed");
    }

    /**
     * @dev Gets pending revenue for a token
     * @param tokenId Token ID
     * @return Pending revenue amount
     */
    function getPendingRevenue(uint256 tokenId) external view returns (uint256) {
        return pendingRevenue[tokenId];
    }

    /**
     * @dev Gets pending revenue for an address (all tokens owned)
     * @param owner Address to check
     * @return Total pending revenue
     */
    function getPendingRevenueForAddress(address owner) external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < MAX_SUPPLY; i++) {
            if (_ownerOf(i) == owner) {
                total += pendingRevenue[i];
            }
        }
        return total;
    }

    /**
     * @dev Gets all tokens owned by an address
     * @param owner Address to check
     * @return Array of token IDs
     */
    function getTokensOwnedBy(address owner) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < MAX_SUPPLY; i++) {
            if (_ownerOf(i) == owner) {
                count++;
            }
        }

        uint256[] memory tokens = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < MAX_SUPPLY; i++) {
            if (_ownerOf(i) == owner) {
                tokens[index] = i;
                index++;
            }
        }

        return tokens;
    }

    /**
     * @dev Checks if a sword has governance veto power
     * @param tokenId Token ID
     * @return Whether the sword has veto power
     */
    function hasGovernanceVeto(uint256 tokenId) external view returns (bool) {
        require(tokenId < MAX_SUPPLY, "Invalid token ID");
        return swordMetadata[tokenId].hasGovernanceVeto;
    }

    /**
     * @dev Pauses all token transfers
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Hook called before any token transfer
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    // The following functions are overrides required by Solidity

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Allows contract to receive ETH
     */
    receive() external payable {
        require(hasRole(REVENUE_DISTRIBUTOR_ROLE, msg.sender), "Unauthorized");
        totalForgeFees += msg.value;
        emit RevenueDeposited(msg.value, totalForgeFees);
    }
}
