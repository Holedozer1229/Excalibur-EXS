// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TreasuryDAO
 * @dev Multi-sig treasury with transparent governance
 * 
 * Manages the 10% treasury allocation (2,100,000 EXS)
 * Requires multiple signatures for fund movements
 * Provides transparent tracking of all transactions
 */
contract TreasuryDAO is AccessControl, ReentrancyGuard {
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmations;
        uint256 timestamp;
        string description;
    }

    struct Signer {
        address addr;
        bool active;
        uint256 addedAt;
    }

    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;
    mapping(address => Signer) public signers;
    
    address[] public signerAddresses;
    uint256 public requiredConfirmations;
    uint256 public transactionCount;
    uint256 public activeSignerCount;

    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event RequiredConfirmationsChanged(uint256 newRequired);
    event TransactionSubmitted(
        uint256 indexed txId,
        address indexed submitter,
        address indexed to,
        uint256 value,
        string description
    );
    event TransactionConfirmed(uint256 indexed txId, address indexed signer);
    event TransactionRevoked(uint256 indexed txId, address indexed signer);
    event TransactionExecuted(uint256 indexed txId, address indexed executor);
    event Deposit(address indexed from, uint256 amount);

    modifier onlyActiveSigner() {
        require(signers[msg.sender].active, "Not an active signer");
        _;
    }

    modifier txExists(uint256 txId) {
        require(txId < transactionCount, "Transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 txId) {
        require(!transactions[txId].executed, "Transaction already executed");
        _;
    }

    modifier notConfirmed(uint256 txId) {
        require(!confirmations[txId][msg.sender], "Transaction already confirmed");
        _;
    }

    constructor(address[] memory _signers, uint256 _requiredConfirmations) {
        require(_signers.length > 0, "Signers required");
        require(
            _requiredConfirmations > 0 && _requiredConfirmations <= _signers.length,
            "Invalid confirmation count"
        );

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            require(signer != address(0), "Invalid signer");
            require(!signers[signer].active, "Duplicate signer");

            signers[signer] = Signer({
                addr: signer,
                active: true,
                addedAt: block.timestamp
            });
            signerAddresses.push(signer);
            _grantRole(SIGNER_ROLE, signer);
            
            emit SignerAdded(signer);
        }

        activeSignerCount = _signers.length;
        requiredConfirmations = _requiredConfirmations;
    }

    /**
     * @dev Submits a transaction for approval
     * @param to Destination address
     * @param value Amount to send
     * @param data Transaction data
     * @param description Human-readable description
     */
    function submitTransaction(
        address to,
        uint256 value,
        bytes memory data,
        string memory description
    ) external onlyActiveSigner returns (uint256) {
        require(to != address(0), "Invalid destination");

        uint256 txId = transactionCount;
        transactions[txId] = Transaction({
            to: to,
            value: value,
            data: data,
            executed: false,
            confirmations: 0,
            timestamp: block.timestamp,
            description: description
        });

        transactionCount++;

        emit TransactionSubmitted(txId, msg.sender, to, value, description);

        // Auto-confirm by submitter
        confirmTransaction(txId);

        return txId;
    }

    /**
     * @dev Confirms a transaction
     * @param txId Transaction ID
     */
    function confirmTransaction(uint256 txId)
        public
        onlyActiveSigner
        txExists(txId)
        notExecuted(txId)
        notConfirmed(txId)
    {
        confirmations[txId][msg.sender] = true;
        transactions[txId].confirmations++;

        emit TransactionConfirmed(txId, msg.sender);

        // Auto-execute if threshold reached
        if (transactions[txId].confirmations >= requiredConfirmations) {
            executeTransaction(txId);
        }
    }

    /**
     * @dev Revokes confirmation for a transaction
     * @param txId Transaction ID
     */
    function revokeConfirmation(uint256 txId)
        external
        onlyActiveSigner
        txExists(txId)
        notExecuted(txId)
    {
        require(confirmations[txId][msg.sender], "Transaction not confirmed");

        confirmations[txId][msg.sender] = false;
        transactions[txId].confirmations--;

        emit TransactionRevoked(txId, msg.sender);
    }

    /**
     * @dev Executes a confirmed transaction
     * @param txId Transaction ID
     */
    function executeTransaction(uint256 txId)
        public
        txExists(txId)
        notExecuted(txId)
        nonReentrant
    {
        Transaction storage transaction = transactions[txId];
        
        require(
            transaction.confirmations >= requiredConfirmations,
            "Insufficient confirmations"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "Transaction execution failed");

        emit TransactionExecuted(txId, msg.sender);
    }

    /**
     * @dev Adds a new signer
     * @param signer Address of new signer
     */
    function addSigner(address signer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(signer != address(0), "Invalid signer");
        require(!signers[signer].active, "Signer already active");

        signers[signer] = Signer({
            addr: signer,
            active: true,
            addedAt: block.timestamp
        });
        signerAddresses.push(signer);
        activeSignerCount++;
        
        _grantRole(SIGNER_ROLE, signer);

        emit SignerAdded(signer);
    }

    /**
     * @dev Removes a signer
     * @param signer Address of signer to remove
     */
    function removeSigner(address signer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(signers[signer].active, "Signer not active");
        require(activeSignerCount > requiredConfirmations, "Would break threshold");

        signers[signer].active = false;
        activeSignerCount--;
        
        _revokeRole(SIGNER_ROLE, signer);

        emit SignerRemoved(signer);
    }

    /**
     * @dev Changes required confirmations
     * @param _requiredConfirmations New required confirmations
     */
    function changeRequiredConfirmations(uint256 _requiredConfirmations)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            _requiredConfirmations > 0 && _requiredConfirmations <= activeSignerCount,
            "Invalid confirmation count"
        );

        requiredConfirmations = _requiredConfirmations;

        emit RequiredConfirmationsChanged(_requiredConfirmations);
    }

    /**
     * @dev Gets transaction details
     * @param txId Transaction ID
     * @return Transaction details
     */
    function getTransaction(uint256 txId)
        external
        view
        txExists(txId)
        returns (Transaction memory)
    {
        return transactions[txId];
    }

    /**
     * @dev Gets number of confirmations for a transaction
     * @param txId Transaction ID
     * @return Number of confirmations
     */
    function getConfirmationCount(uint256 txId)
        external
        view
        txExists(txId)
        returns (uint256)
    {
        return transactions[txId].confirmations;
    }

    /**
     * @dev Checks if a signer has confirmed a transaction
     * @param txId Transaction ID
     * @param signer Signer address
     * @return Whether the signer has confirmed
     */
    function hasConfirmed(uint256 txId, address signer)
        external
        view
        txExists(txId)
        returns (bool)
    {
        return confirmations[txId][signer];
    }

    /**
     * @dev Gets all active signers
     * @return Array of active signer addresses
     */
    function getActiveSigners() external view returns (address[] memory) {
        address[] memory activeSigners = new address[](activeSignerCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < signerAddresses.length; i++) {
            if (signers[signerAddresses[i]].active) {
                activeSigners[index] = signerAddresses[i];
                index++;
            }
        }
        
        return activeSigners;
    }

    /**
     * @dev Gets pending transactions (not executed)
     * @return Array of pending transaction IDs
     */
    function getPendingTransactions() external view returns (uint256[] memory) {
        uint256 pendingCount = 0;
        for (uint256 i = 0; i < transactionCount; i++) {
            if (!transactions[i].executed) {
                pendingCount++;
            }
        }

        uint256[] memory pending = new uint256[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 0; i < transactionCount; i++) {
            if (!transactions[i].executed) {
                pending[index] = i;
                index++;
            }
        }

        return pending;
    }

    /**
     * @dev Allows contract to receive ETH
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Fallback function
     */
    fallback() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}
