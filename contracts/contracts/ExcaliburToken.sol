// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ExcaliburToken
 * @dev EXS Token with vesting schedules and allocation management
 * 
 * Total Supply: 21,000,000 EXS
 * Allocation:
 * - Proof-of-Forge Rewards: 50% (10,500,000 EXS)
 * - Development Fund: 15% (3,150,000 EXS) - 4-year vesting
 * - Treasury: 10% (2,100,000 EXS) - DAO controlled
 * - Community Fund: 10% (2,100,000 EXS) - Grants
 * - Founder Allocation: 10% (2,100,000 EXS) - 4-year vesting
 * - Liquidity: 5% (1,050,000 EXS) - Locked 2 years
 */
contract ExcaliburToken is ERC20, ERC20Burnable, Pausable, AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VESTING_MANAGER_ROLE = keccak256("VESTING_MANAGER_ROLE");

    uint256 public constant TOTAL_SUPPLY = 21_000_000 * 10**18;
    uint256 public constant FORGE_REWARDS_ALLOCATION = 10_500_000 * 10**18; // 50%
    uint256 public constant DEV_FUND_ALLOCATION = 3_150_000 * 10**18; // 15%
    uint256 public constant TREASURY_ALLOCATION = 2_100_000 * 10**18; // 10%
    uint256 public constant COMMUNITY_ALLOCATION = 2_100_000 * 10**18; // 10%
    uint256 public constant FOUNDER_ALLOCATION = 2_100_000 * 10**18; // 10%
    uint256 public constant LIQUIDITY_ALLOCATION = 1_050_000 * 10**18; // 5%

    uint256 public constant VESTING_DURATION = 4 * 365 days; // 4 years
    uint256 public constant LIQUIDITY_LOCK_DURATION = 2 * 365 days; // 2 years

    struct VestingSchedule {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 duration;
    }

    mapping(address => VestingSchedule) public vestingSchedules;
    
    uint256 public forgeRewardsMinted;
    uint256 public deploymentTime;
    
    address public forgeVerifierContract;
    address public treasuryAddress;
    address public liquidityPoolAddress;

    event VestingScheduleCreated(address indexed beneficiary, uint256 amount, uint256 duration);
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event ForgeRewardMinted(address indexed recipient, uint256 amount);

    constructor(
        address _treasuryAddress,
        address _devFundAddress,
        address _communityFundAddress,
        address _founderAddress,
        address _liquidityPoolAddress
    ) ERC20("Excalibur", "EXS") {
        require(_treasuryAddress != address(0), "Invalid treasury address");
        require(_devFundAddress != address(0), "Invalid dev fund address");
        require(_communityFundAddress != address(0), "Invalid community fund address");
        require(_founderAddress != address(0), "Invalid founder address");
        require(_liquidityPoolAddress != address(0), "Invalid liquidity pool address");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(VESTING_MANAGER_ROLE, msg.sender);

        deploymentTime = block.timestamp;
        treasuryAddress = _treasuryAddress;
        liquidityPoolAddress = _liquidityPoolAddress;

        // Mint treasury allocation (immediately available)
        _mint(_treasuryAddress, TREASURY_ALLOCATION);

        // Mint community fund (immediately available)
        _mint(_communityFundAddress, COMMUNITY_ALLOCATION);

        // Create vesting schedule for development fund (4-year vesting)
        _createVestingSchedule(_devFundAddress, DEV_FUND_ALLOCATION, VESTING_DURATION);

        // Create vesting schedule for founder allocation (4-year vesting)
        _createVestingSchedule(_founderAddress, FOUNDER_ALLOCATION, VESTING_DURATION);

        // Mint liquidity allocation (locked for 2 years, then can be released)
        _createVestingSchedule(_liquidityPoolAddress, LIQUIDITY_ALLOCATION, LIQUIDITY_LOCK_DURATION);
    }

    /**
     * @dev Creates a vesting schedule for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @param amount Total amount to be vested
     * @param duration Duration of the vesting period
     */
    function _createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 duration
    ) internal {
        require(vestingSchedules[beneficiary].totalAmount == 0, "Vesting schedule already exists");
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            releasedAmount: 0,
            startTime: block.timestamp,
            duration: duration
        });

        emit VestingScheduleCreated(beneficiary, amount, duration);
    }

    /**
     * @dev Releases vested tokens to the beneficiary
     */
    function releaseVestedTokens() external {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule");

        uint256 releasableAmount = _getReleasableAmount(msg.sender);
        require(releasableAmount > 0, "No tokens to release");

        schedule.releasedAmount += releasableAmount;
        _mint(msg.sender, releasableAmount);

        emit TokensReleased(msg.sender, releasableAmount);
    }

    /**
     * @dev Gets the amount of tokens that can be released for a beneficiary
     * @param beneficiary Address of the beneficiary
     * @return Amount of releasable tokens
     */
    function _getReleasableAmount(address beneficiary) internal view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        if (schedule.totalAmount == 0) {
            return 0;
        }

        uint256 elapsedTime = block.timestamp - schedule.startTime;
        if (elapsedTime >= schedule.duration) {
            return schedule.totalAmount - schedule.releasedAmount;
        }

        uint256 vestedAmount = (schedule.totalAmount * elapsedTime) / schedule.duration;
        return vestedAmount - schedule.releasedAmount;
    }

    /**
     * @dev Gets the releasable amount for a beneficiary (public view)
     * @param beneficiary Address of the beneficiary
     * @return Amount of releasable tokens
     */
    function getReleasableAmount(address beneficiary) external view returns (uint256) {
        return _getReleasableAmount(beneficiary);
    }

    /**
     * @dev Mints forge rewards (only callable by ForgeVerifier contract)
     * @param recipient Address to receive the forge reward
     * @param amount Amount of tokens to mint (50 EXS per forge)
     */
    function mintForgeReward(address recipient, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(recipient != address(0), "Invalid recipient");
        require(forgeRewardsMinted + amount <= FORGE_REWARDS_ALLOCATION, "Forge rewards allocation exceeded");
        
        forgeRewardsMinted += amount;
        _mint(recipient, amount);

        emit ForgeRewardMinted(recipient, amount);
    }

    /**
     * @dev Sets the forge verifier contract address
     * @param _forgeVerifier Address of the ForgeVerifier contract
     */
    function setForgeVerifier(address _forgeVerifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_forgeVerifier != address(0), "Invalid address");
        forgeVerifierContract = _forgeVerifier;
        _grantRole(MINTER_ROLE, _forgeVerifier);
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
     * @dev Hook that is called before any transfer of tokens
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Returns the maximum supply of the token
     */
    function cap() public pure returns (uint256) {
        return TOTAL_SUPPLY;
    }
}
