//! Excalibur EXS Blockchain Node

use anyhow::Result;
use clap::{Parser, Subcommand};
use excalibur_blockchain::crypto::{proof_of_forge, CANONICAL_PROPHECY};
use bitcoin::Network;

#[derive(Parser)]
#[command(name = "excalibur-node")]
#[command(about = "Excalibur EXS Blockchain Node", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Start the blockchain node
    Start {
        /// Network to connect to (mainnet, testnet, regtest)
        #[arg(short, long, default_value = "mainnet")]
        network: String,
        
        /// Port to listen on
        #[arg(short, long, default_value = "8333")]
        port: u16,
    },
    
    /// Perform a proof-of-forge derivation
    Forge {
        /// Use custom prophecy words (13 words, space-separated)
        #[arg(short, long)]
        prophecy: Option<String>,
        
        /// Network (mainnet, testnet, regtest)
        #[arg(short, long, default_value = "mainnet")]
        network: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Start { network, port } => {
            println!("🗡️  Starting Excalibur EXS Blockchain Node");
            println!("Network: {}", network);
            println!("Port: {}", port);
            println!("\n⚠️  Node implementation is in progress.");
            println!("This is the foundation for the full P2P blockchain node.");
            Ok(())
        }
        Commands::Forge { prophecy, network } => {
            let network = match network.as_str() {
                "mainnet" => Network::Bitcoin,
                "testnet" => Network::Testnet,
                "regtest" => Network::Regtest,
                _ => Network::Bitcoin,
            };

            let words: Vec<String> = if let Some(p) = prophecy {
                p.split_whitespace().map(|s| s.to_string()).collect()
            } else {
                CANONICAL_PROPHECY.iter().map(|s| s.to_string()).collect()
            };

            println!("🔮 Performing Proof-of-Forge...");
            println!("Prophecy: {}", words.join(" "));
            
            let result = proof_of_forge(&words, None, network)?;
            
            println!("\n✨ Proof-of-Forge Complete!");
            println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            println!("Prophecy Hash: {}", hex::encode(&result.prophecy_hash[..8]));
            println!("Tetra Hash:    {}", hex::encode(&result.tetra_hash[..8]));
            println!("Tempered Key:  {}", hex::encode(&result.tempered_key[..8]));
            println!("Final Seed:    {}", hex::encode(&result.final_seed[..8]));
            println!("\n🏰 Taproot Address:");
            println!("{}", result.taproot_address);
            println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            
            Ok(())
        }
    }
}
