//! JSON-RPC API server

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::{Result, anyhow};

/// JSON-RPC request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub method: String,
    pub params: Option<Value>,
    pub id: Value,
}

/// JSON-RPC response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
    pub id: Value,
}

/// JSON-RPC error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

/// RPC method handler
type RpcHandler = Arc<dyn Fn(Option<Value>) -> Result<Value> + Send + Sync>;

/// JSON-RPC server
pub struct RpcServer {
    handlers: Arc<RwLock<HashMap<String, RpcHandler>>>,
    state: Arc<RwLock<ServerState>>,
}

#[derive(Debug, Clone)]
struct ServerState {
    chain_height: u64,
    total_forges: u64,
    peer_count: usize,
    version: String,
}

impl RpcServer {
    /// Create a new RPC server
    pub fn new() -> Self {
        let mut server = RpcServer {
            handlers: Arc::new(RwLock::new(HashMap::new())),
            state: Arc::new(RwLock::new(ServerState {
                chain_height: 0,
                total_forges: 0,
                peer_count: 0,
                version: "1.0.0".to_string(),
            })),
        };
        
        server.register_default_handlers();
        server
    }

    /// Register default RPC handlers
    fn register_default_handlers(&mut self) {
        let state = Arc::clone(&self.state);
        
        // getblockcount - Get current block height
        self.register_handler("getblockcount", move |_params| {
            let state = futures::executor::block_on(state.read());
            Ok(json!(state.chain_height))
        });

        let state = Arc::clone(&self.state);
        
        // getinfo - Get general blockchain info
        self.register_handler("getinfo", move |_params| {
            let state = futures::executor::block_on(state.read());
            Ok(json!({
                "version": state.version,
                "blocks": state.chain_height,
                "forges": state.total_forges,
                "connections": state.peer_count,
                "network": "mainnet",
                "difficulty": 2,
            }))
        });

        // getblock - Get block by height
        self.register_handler("getblock", |params| {
            let height = params
                .and_then(|p| p.as_u64())
                .ok_or_else(|| anyhow!("Missing or invalid 'height' parameter"))?;
            
            // This would normally fetch from chain store
            Ok(json!({
                "height": height,
                "hash": format!("{:064x}", height),
                "forges": [],
                "timestamp": 0,
            }))
        });

        // getforge - Get forge transaction by proof hash
        self.register_handler("getforge", |params| {
            let proof_hash = params
                .and_then(|p| p.as_str())
                .ok_or_else(|| anyhow!("Missing or invalid 'proof_hash' parameter"))?;
            
            // This would normally fetch from chain store
            Ok(json!({
                "proof_hash": proof_hash,
                "prophecy": "sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
                "taproot_address": "bc1p...",
                "timestamp": 0,
            }))
        });

        // submitforge - Submit a new forge transaction
        self.register_handler("submitforge", |params| {
            let forge_data = params
                .ok_or_else(|| anyhow!("Missing forge data"))?;
            
            // This would normally validate and add to mempool
            Ok(json!({
                "success": true,
                "txid": "0000000000000000000000000000000000000000000000000000000000000000",
            }))
        });

        let state = Arc::clone(&self.state);
        
        // getpeerinfo - Get connected peers
        self.register_handler("getpeerinfo", move |_params| {
            let state = futures::executor::block_on(state.read());
            Ok(json!({
                "peer_count": state.peer_count,
                "peers": [],
            }))
        });

        // validatepropohecy - Validate a prophecy
        self.register_handler("validateprophecy", |params| {
            let prophecy = params
                .and_then(|p| p.as_str())
                .ok_or_else(|| anyhow!("Missing or invalid 'prophecy' parameter"))?;
            
            let is_valid = prophecy == "sword legend pull magic kingdom artist stone destroy forget fire steel honey question";
            
            Ok(json!({
                "valid": is_valid,
                "prophecy": prophecy,
            }))
        });

        // getdifficulty - Get current mining difficulty
        self.register_handler("getdifficulty", |_params| {
            Ok(json!(2))
        });
    }

    /// Register a custom RPC handler
    pub fn register_handler<F>(&mut self, method: &str, handler: F)
    where
        F: Fn(Option<Value>) -> Result<Value> + Send + Sync + 'static,
    {
        let handlers = Arc::clone(&self.handlers);
        futures::executor::block_on(async {
            let mut handlers = handlers.write().await;
            handlers.insert(method.to_string(), Arc::new(handler));
        });
    }

    /// Handle a JSON-RPC request
    pub async fn handle_request(&self, request: JsonRpcRequest) -> JsonRpcResponse {
        // Validate JSON-RPC version
        if request.jsonrpc != "2.0" {
            return JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: None,
                error: Some(JsonRpcError {
                    code: -32600,
                    message: "Invalid Request - jsonrpc must be '2.0'".to_string(),
                    data: None,
                }),
                id: request.id,
            };
        }

        // Get handler
        let handlers = self.handlers.read().await;
        let handler = match handlers.get(&request.method) {
            Some(h) => Arc::clone(h),
            None => {
                return JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32601,
                        message: format!("Method not found: {}", request.method),
                        data: None,
                    }),
                    id: request.id,
                };
            }
        };
        
        drop(handlers);

        // Execute handler
        match handler(request.params) {
            Ok(result) => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: Some(result),
                error: None,
                id: request.id,
            },
            Err(e) => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: None,
                error: Some(JsonRpcError {
                    code: -32603,
                    message: "Internal error".to_string(),
                    data: Some(json!({ "error": e.to_string() })),
                }),
                id: request.id,
            },
        }
    }

    /// Handle a raw JSON request string
    pub async fn handle_request_str(&self, request_str: &str) -> String {
        let request: JsonRpcRequest = match serde_json::from_str(request_str) {
            Ok(r) => r,
            Err(e) => {
                let error_response = JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32700,
                        message: "Parse error".to_string(),
                        data: Some(json!({ "error": e.to_string() })),
                    }),
                    id: Value::Null,
                };
                return serde_json::to_string(&error_response).unwrap();
            }
        };

        let response = self.handle_request(request).await;
        serde_json::to_string(&response).unwrap()
    }

    /// Update server state
    pub async fn update_state(&self, height: u64, forges: u64, peers: usize) {
        let mut state = self.state.write().await;
        state.chain_height = height;
        state.total_forges = forges;
        state.peer_count = peers;
    }

    /// Run RPC server on HTTP endpoint
    #[cfg(feature = "http-server")]
    pub async fn run_http(&self, addr: &str) -> Result<()> {
        use warp::Filter;
        
        let rpc = self.clone();
        let rpc_handler = warp::path!("rpc")
            .and(warp::post())
            .and(warp::body::json())
            .and_then(move |req: JsonRpcRequest| {
                let rpc = rpc.clone();
                async move {
                    let response = rpc.handle_request(req).await;
                    Ok::<_, std::convert::Infallible>(warp::reply::json(&response))
                }
            });

        let addr: std::net::SocketAddr = addr.parse()?;
        warp::serve(rpc_handler).run(addr).await;
        Ok(())
    }
}

impl Clone for RpcServer {
    fn clone(&self) -> Self {
        RpcServer {
            handlers: Arc::clone(&self.handlers),
            state: Arc::clone(&self.state),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rpc_server_creation() {
        let server = RpcServer::new();
        let request = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "getblockcount".to_string(),
            params: None,
            id: json!(1),
        };
        
        let response = server.handle_request(request).await;
        assert_eq!(response.jsonrpc, "2.0");
        assert!(response.result.is_some());
    }

    #[tokio::test]
    async fn test_getinfo() {
        let server = RpcServer::new();
        let request = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "getinfo".to_string(),
            params: None,
            id: json!(1),
        };
        
        let response = server.handle_request(request).await;
        assert!(response.result.is_some());
        let result = response.result.unwrap();
        assert!(result.get("version").is_some());
        assert!(result.get("blocks").is_some());
    }

    #[tokio::test]
    async fn test_method_not_found() {
        let server = RpcServer::new();
        let request = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "nonexistent_method".to_string(),
            params: None,
            id: json!(1),
        };
        
        let response = server.handle_request(request).await;
        assert!(response.error.is_some());
        assert_eq!(response.error.unwrap().code, -32601);
    }

    #[tokio::test]
    async fn test_invalid_jsonrpc_version() {
        let server = RpcServer::new();
        let request = JsonRpcRequest {
            jsonrpc: "1.0".to_string(),
            method: "getinfo".to_string(),
            params: None,
            id: json!(1),
        };
        
        let response = server.handle_request(request).await;
        assert!(response.error.is_some());
        assert_eq!(response.error.unwrap().code, -32600);
    }
}
