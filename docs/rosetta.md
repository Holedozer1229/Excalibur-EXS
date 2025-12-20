# Rosetta API Integration for Excalibur-ESX

## Overview

This document describes the Rosetta API implementation for Excalibur-ESX ($EXS), enabling seamless integration with cryptocurrency exchanges, particularly Coinbase.

## Rosetta API Specification Compliance

**Version:** 1.4.13  
**Blockchain:** Excalibur-ESX  
**Currency Symbol:** EXS  
**Decimals:** 8

## Architecture

### Server Implementation

The Rosetta API server is implemented in Go and located at `/cmd/rosetta`. It provides RESTful endpoints compliant with the Rosetta specification.

**Starting the Server:**
```bash
cd cmd/rosetta
go run main.go serve --port 8080 --network mainnet
```

## API Endpoints

### 1. Network Endpoints

#### POST /network/list
Returns all available networks.

**Request:**
```json
{
  "metadata": {}
}
```

**Response:**
```json
{
  "network_identifiers": [
    {
      "blockchain": "Excalibur-ESX",
      "network": "mainnet"
    },
    {
      "blockchain": "Excalibur-ESX",
      "network": "testnet"
    }
  ]
}
```

#### POST /network/options
Returns version and capability information.

**Request:**
```json
{
  "network_identifier": {
    "blockchain": "Excalibur-ESX",
    "network": "mainnet"
  }
}
```

**Response:**
```json
{
  "version": {
    "rosetta_version": "1.4.13",
    "node_version": "0.1.0"
  },
  "allow": {
    "operation_statuses": [
      {
        "status": "SUCCESS",
        "successful": true
      },
      {
        "status": "FAILED",
        "successful": false
      }
    ],
    "operation_types": [
      "TRANSFER",
      "STAKE",
      "UNSTAKE"
    ],
    "errors": [
      {
        "code": 1,
        "message": "Network not found",
        "retriable": false
      },
      {
        "code": 2,
        "message": "Account not found",
        "retriable": true
      }
    ]
  }
}
```

#### POST /network/status
Returns current network status.

**Request:**
```json
{
  "network_identifier": {
    "blockchain": "Excalibur-ESX",
    "network": "mainnet"
  }
}
```

**Response:**
```json
{
  "current_block_identifier": {
    "index": 1000,
    "hash": "0x..."
  },
  "current_block_timestamp": 1700000000000,
  "genesis_block_identifier": {
    "index": 0,
    "hash": "0x..."
  },
  "peers": []
}
```

### 2. Account Endpoints

#### POST /account/balance
Queries balance for a Taproot address.

**Request:**
```json
{
  "network_identifier": {
    "blockchain": "Excalibur-ESX",
    "network": "mainnet"
  },
  "account_identifier": {
    "address": "bc1p..."
  }
}
```

**Response:**
```json
{
  "block_identifier": {
    "index": 1000,
    "hash": "0x..."
  },
  "balances": [
    {
      "value": "100000000",
      "currency": {
        "symbol": "EXS",
        "decimals": 8
      }
    }
  ]
}
```

**Address Validation:**
- Only Taproot (P2TR) addresses are supported
- Must use Bech32m encoding
- Witness version must be 1
- Format: `bc1p...` (mainnet) or `tb1p...` (testnet)

### 3. Block Endpoints

#### POST /block
Retrieves block information.

**Request:**
```json
{
  "network_identifier": {
    "blockchain": "Excalibur-ESX",
    "network": "mainnet"
  },
  "block_identifier": {
    "index": 1000
  }
}
```

**Response:**
```json
{
  "block": {
    "block_identifier": {
      "index": 1000,
      "hash": "0x..."
    },
    "parent_block_identifier": {
      "index": 999,
      "hash": "0x..."
    },
    "timestamp": 1700000000000,
    "transactions": []
  }
}
```

### 4. Health Endpoint

#### GET /health
Returns server health status (non-standard extension).

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "network": "mainnet",
  "tetra_pow": "active",
  "hpp1_rounds": 600000
}
```

## Transaction Construction

### Operation Types

1. **TRANSFER**: Standard value transfer between addresses
   - From: Source Taproot address
   - To: Destination Taproot address
   - Amount: Value in satoshis (1 EXS = 10⁸ satoshis)

2. **STAKE**: Lock EXS for network validation
   - Locks funds for a specified period
   - Generates staking rewards

3. **UNSTAKE**: Release staked EXS
   - Unlocks previously staked funds
   - Subject to unbonding period

### Transaction Flow

```
1. /construction/derive
   - Derive address from public key

2. /construction/preprocess
   - Construct metadata for transaction

3. /construction/metadata
   - Fetch current network metadata (fees, nonce)

4. /construction/payloads
   - Generate unsigned transaction

5. /construction/parse
   - Parse transaction (unsigned)

6. /construction/combine
   - Combine signatures with unsigned transaction

7. /construction/parse
   - Parse transaction (signed)

8. /construction/hash
   - Get transaction hash

9. /construction/submit
   - Submit signed transaction to network
```

## Taproot-Specific Considerations

### Address Generation

Excalibur-ESX uses Taproot (P2TR) addresses exclusively:

```go
vault, err := bitcoin.GenerateTaprootVault(prophecyWords, &chaincfg.MainNetParams)
address := vault.Address // bc1p...
```

### Signature Scheme

- **Algorithm**: Schnorr signatures (BIP 340)
- **Curve**: secp256k1
- **Hash**: SHA-256 (tagged hashes for BIP 340)

### Key Tweaking

All keys are tweaked using the 13-word prophecy axiom:
```
TweakHash = SHA-256(InternalKey || ProphecyHash)
OutputKey = InternalKey + TweakHash·G
```

## Testing

### Validate Address

```bash
cd cmd/rosetta
go run main.go validate-address bc1p...
```

### Generate Test Vault

```bash
cd cmd/rosetta
go run main.go generate-vault --network testnet
```

### Test Server Health

```bash
curl http://localhost:8080/health
```

### Test Network List

```bash
curl -X POST http://localhost:8080/network/list \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Integration with Coinbase

### Prerequisites

1. Implement all required Rosetta endpoints
2. Support Taproot address validation
3. Handle transaction signing with Schnorr signatures
4. Provide accurate balance queries
5. Implement proper error handling

### Validation Process

Coinbase validates implementations using `rosetta-cli`:

```bash
rosetta-cli check:data --configuration-file config.json
rosetta-cli check:construction --configuration-file config.json
```

### Configuration Example

```json
{
  "network": {
    "blockchain": "Excalibur-ESX",
    "network": "mainnet"
  },
  "online_url": "http://localhost:8080",
  "data_directory": "./rosetta-data",
  "http_timeout": 300,
  "max_retries": 5,
  "retry_elapsed_time": 0,
  "max_online_connections": 120,
  "max_sync_concurrency": 64,
  "tip_delay": 300,
  "log_configuration": false,
  "compression_disabled": false,
  "memory_limit_disabled": false
}
```

## Error Handling

### Standard Errors

| Code | Message | Retriable | Description |
|------|---------|-----------|-------------|
| 1 | Network not found | false | Invalid network identifier |
| 2 | Account not found | true | Address has no transactions |
| 3 | Block not found | true | Block height/hash not found |
| 4 | Transaction failed | false | Transaction validation failed |
| 5 | Invalid address | false | Malformed Taproot address |

### Custom Errors

| Code | Message | Retriable | Description |
|------|---------|-----------|-------------|
| 100 | HPP-1 computation failed | false | Key derivation error |
| 101 | Tetra-PoW verification failed | false | Invalid proof of work |
| 102 | Prophecy axiom invalid | false | Invalid 13-word prophecy |

## Security Considerations

1. **Rate Limiting**: Implement per-IP rate limits
2. **Input Validation**: Validate all addresses and amounts
3. **HTTPS**: Use TLS in production
4. **CORS**: Configure appropriate CORS headers
5. **Authentication**: Optional API key authentication

## Performance Optimization

1. **Caching**: Cache network status and block data
2. **Connection Pooling**: Reuse HTTP connections
3. **Batch Requests**: Support batch balance queries
4. **Indexing**: Index addresses for fast lookups
5. **Pruning**: Prune old transaction data

## Monitoring

### Metrics to Track

- Request rate per endpoint
- Response time (p50, p95, p99)
- Error rate by error code
- Active connections
- Tetra-PoW verification time
- HPP-1 computation time

### Logging

```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "info",
  "endpoint": "/account/balance",
  "address": "bc1p...",
  "response_time_ms": 45,
  "status": 200
}
```

## Future Enhancements

1. **Mempool Endpoints**: Real-time unconfirmed transactions
2. **Event Streaming**: WebSocket support for live updates
3. **Historical Queries**: Query historical balances at specific blocks
4. **Multi-sig Support**: Taproot script path spending
5. **Lightning Integration**: Off-chain payment channels

## Resources

- [Rosetta API Documentation](https://www.rosetta-api.org/)
- [Rosetta Specification](https://github.com/coinbase/rosetta-specifications)
- [BIP 341: Taproot](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki)
- [BIP 350: Bech32m](https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki)

## Support

For integration support:
- Email: rosetta-support@excalibur-esx.io
- GitHub Issues: https://github.com/Holedozer1229/Excalibur-ESX/issues
- Discord: https://discord.gg/excalibur-esx

---

*Last Updated: 2024*  
*Rosetta API Version: 1.4.13*  
*Excalibur-ESX Version: 0.1.0*
