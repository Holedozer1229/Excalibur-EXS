// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockBitcoinOracle
 * @dev Mock Bitcoin oracle for testing ForgeVerifier oracle integration
 * 
 * Simulates various oracle response scenarios:
 * - Successful verification with valid Bitcoin transaction data
 * - Explicit failures with error codes/reasons
 * - Invalid/malformed responses
 * - Stale data (old timestamps)
 * - Timeout scenarios (via revert)
 * - Manipulated data scenarios
 */
contract MockBitcoinOracle is Ownable {
    
    enum ResponseType {
        SUCCESS,           // Valid verification response
        FAILURE,           // Explicit failure with reason
        INVALID_FORMAT,    // Malformed response
        STALE_DATA,        // Data too old
        TIMEOUT,           // Reverts to simulate timeout
        MANIPULATED        // Data appears manipulated
    }
    
    struct BitcoinTxData {
        bytes32 txHash;
        bytes32 taprootAddress;
        uint256 amount;
        uint256 confirmations;
        uint256 blockHeight;
        uint256 timestamp;
        bool exists;
    }
    
    // Configuration for next oracle response
    ResponseType public nextResponseType;
    string public nextFailureReason;
    BitcoinTxData public nextTxData;
    
    // Track verification requests for testing
    mapping(bytes32 => uint256) public verificationRequests;
    uint256 public totalRequests;
    
    // Circuit breaker simulation
    uint256 public consecutiveFailures;
    uint256 public constant MAX_CONSECUTIVE_FAILURES = 5;
    bool public circuitBreakerTripped;
    
    // Timestamp manipulation for testing
    uint256 public mockCurrentTime;
    uint256 public constant STALE_DATA_THRESHOLD = 1 hours;
    
    event VerificationRequested(bytes32 indexed txHash, address indexed requester);
    event ResponseConfigured(ResponseType responseType, string reason);
    event CircuitBreakerTripped(uint256 failures);
    event CircuitBreakerReset();
    
    constructor() Ownable(msg.sender) {
        nextResponseType = ResponseType.SUCCESS;
        mockCurrentTime = block.timestamp;
    }
    
    /**
     * @dev Main oracle verification function
     * @param txHash Bitcoin transaction hash to verify
     * @param taprootAddress Expected Taproot address
     * @param minAmount Minimum amount expected
     * @return success Whether verification succeeded
     * @return reason Failure reason if applicable
     * @return txData Transaction data if verification succeeded
     */
    function verifyBitcoinTransaction(
        bytes32 txHash,
        bytes32 taprootAddress,
        uint256 minAmount
    ) external returns (
        bool success,
        string memory reason,
        BitcoinTxData memory txData
    ) {
        verificationRequests[txHash]++;
        totalRequests++;
        
        emit VerificationRequested(txHash, msg.sender);
        
        // Circuit breaker check
        if (circuitBreakerTripped) {
            consecutiveFailures++;
            return (false, "Circuit breaker tripped - oracle unavailable", txData);
        }
        
        // Handle different response types
        if (nextResponseType == ResponseType.TIMEOUT) {
            revert("Oracle timeout - Bitcoin node unreachable");
        }
        
        if (nextResponseType == ResponseType.SUCCESS) {
            // Reset consecutive failures on success
            consecutiveFailures = 0;
            
            // Return configured transaction data or default success data
            if (nextTxData.exists) {
                txData = nextTxData;
            } else {
                txData = BitcoinTxData({
                    txHash: txHash,
                    taprootAddress: taprootAddress,
                    amount: minAmount,
                    confirmations: 6,
                    blockHeight: 800000,
                    timestamp: getCurrentTime(),
                    exists: true
                });
            }
            
            return (true, "", txData);
        }
        
        if (nextResponseType == ResponseType.FAILURE) {
            consecutiveFailures++;
            
            // Trip circuit breaker if too many failures
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                circuitBreakerTripped = true;
                emit CircuitBreakerTripped(consecutiveFailures);
            }
            
            return (false, nextFailureReason, txData);
        }
        
        if (nextResponseType == ResponseType.INVALID_FORMAT) {
            consecutiveFailures++;
            
            // Return incomplete/invalid data
            txData = BitcoinTxData({
                txHash: bytes32(0),
                taprootAddress: bytes32(0),
                amount: 0,
                confirmations: 0,
                blockHeight: 0,
                timestamp: 0,
                exists: false
            });
            
            return (false, "Invalid data format from Bitcoin node", txData);
        }
        
        if (nextResponseType == ResponseType.STALE_DATA) {
            consecutiveFailures++;
            
            // Return data with old timestamp
            txData = BitcoinTxData({
                txHash: txHash,
                taprootAddress: taprootAddress,
                amount: minAmount,
                confirmations: 6,
                blockHeight: 700000,
                timestamp: getCurrentTime() - STALE_DATA_THRESHOLD - 1,
                exists: true
            });
            
            return (false, "Stale data - timestamp too old", txData);
        }
        
        if (nextResponseType == ResponseType.MANIPULATED) {
            consecutiveFailures++;
            
            // Return data that doesn't match request (potential manipulation)
            txData = BitcoinTxData({
                txHash: keccak256("different_hash"),
                taprootAddress: keccak256("different_address"),
                amount: minAmount + 1000,
                confirmations: 1, // Suspiciously low
                blockHeight: 999999999, // Suspiciously high
                timestamp: getCurrentTime(),
                exists: true
            });
            
            return (false, "Data manipulation detected", txData);
        }
        
        // Default fallback
        return (false, "Unknown response type", txData);
    }
    
    /**
     * @dev Simpler verification function for basic oracle role testing
     */
    function simpleVerify(bytes32 txHash) external view returns (bool) {
        return nextResponseType == ResponseType.SUCCESS;
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @dev Configure next oracle response
     */
    function setNextResponse(
        ResponseType _responseType,
        string memory _failureReason
    ) external onlyOwner {
        nextResponseType = _responseType;
        nextFailureReason = _failureReason;
        emit ResponseConfigured(_responseType, _failureReason);
    }
    
    /**
     * @dev Configure transaction data for next response
     */
    function setNextTxData(
        bytes32 _txHash,
        bytes32 _taprootAddress,
        uint256 _amount,
        uint256 _confirmations,
        uint256 _blockHeight,
        uint256 _timestamp
    ) external onlyOwner {
        nextTxData = BitcoinTxData({
            txHash: _txHash,
            taprootAddress: _taprootAddress,
            amount: _amount,
            confirmations: _confirmations,
            blockHeight: _blockHeight,
            timestamp: _timestamp,
            exists: true
        });
    }
    
    /**
     * @dev Clear configured transaction data
     */
    function clearTxData() external onlyOwner {
        delete nextTxData;
    }
    
    /**
     * @dev Reset circuit breaker
     */
    function resetCircuitBreaker() external onlyOwner {
        circuitBreakerTripped = false;
        consecutiveFailures = 0;
        emit CircuitBreakerReset();
    }
    
    /**
     * @dev Set mock current time for testing
     */
    function setMockTime(uint256 _time) external onlyOwner {
        mockCurrentTime = _time;
    }
    
    /**
     * @dev Advance mock time by delta
     */
    function advanceTime(uint256 _delta) external onlyOwner {
        mockCurrentTime += _delta;
    }
    
    /**
     * @dev Get current time (mock or real)
     */
    function getCurrentTime() public view returns (uint256) {
        return mockCurrentTime > 0 ? mockCurrentTime : block.timestamp;
    }
    
    /**
     * @dev Reset all mock state
     */
    function reset() external onlyOwner {
        nextResponseType = ResponseType.SUCCESS;
        nextFailureReason = "";
        delete nextTxData;
        circuitBreakerTripped = false;
        consecutiveFailures = 0;
        mockCurrentTime = block.timestamp;
    }
    
    /**
     * @dev Get verification count for a transaction
     */
    function getVerificationCount(bytes32 txHash) external view returns (uint256) {
        return verificationRequests[txHash];
    }
}
