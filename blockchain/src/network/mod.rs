//! P2P networking with libp2p

use libp2p::{
    gossipsub, identify, kad,
    noise,
    swarm::{NetworkBehaviour, SwarmEvent},
    tcp, yamux, Multiaddr, PeerId, Swarm, Transport,
};
use std::collections::HashSet;
use std::error::Error;
use std::time::Duration;
use tokio::sync::mpsc;

/// Network behavior for Excalibur blockchain
#[derive(NetworkBehaviour)]
pub struct ExcaliburBehaviour {
    pub gossipsub: gossipsub::Behaviour,
    pub kad: kad::Behaviour<kad::store::MemoryStore>,
    pub identify: identify::Behaviour,
}

/// Network manager for P2P communications
pub struct NetworkManager {
    swarm: Swarm<ExcaliburBehaviour>,
    command_receiver: mpsc::Receiver<NetworkCommand>,
    event_sender: mpsc::Sender<NetworkEvent>,
}

/// Commands that can be sent to the network
#[derive(Debug)]
pub enum NetworkCommand {
    PublishBlock(Vec<u8>),
    PublishTransaction(Vec<u8>),
    ConnectPeer(Multiaddr),
    DisconnectPeer(PeerId),
    GetPeers,
}

/// Events emitted by the network
#[derive(Debug, Clone)]
pub enum NetworkEvent {
    BlockReceived(Vec<u8>),
    TransactionReceived(Vec<u8>),
    PeerConnected(PeerId),
    PeerDisconnected(PeerId),
    PeerList(Vec<PeerId>),
}

impl NetworkManager {
    /// Create a new network manager
    pub async fn new(
        listen_addr: Multiaddr,
        bootstrap_peers: Vec<Multiaddr>,
    ) -> Result<(Self, mpsc::Sender<NetworkCommand>, mpsc::Receiver<NetworkEvent>), Box<dyn Error>> {
        // Generate keypair
        let local_key = libp2p::identity::Keypair::generate_ed25519();
        let local_peer_id = PeerId::from(local_key.public());
        
        tracing::info!("Local peer id: {}", local_peer_id);

        // Create transport
        let transport = tcp::tokio::Transport::default()
            .upgrade(libp2p::core::upgrade::Version::V1)
            .authenticate(noise::Config::new(&local_key)?)
            .multiplex(yamux::Config::default())
            .boxed();

        // Configure Gossipsub
        let gossipsub_config = gossipsub::ConfigBuilder::default()
            .heartbeat_interval(Duration::from_secs(10))
            .validation_mode(gossipsub::ValidationMode::Strict)
            .build()
            .expect("Valid gossipsub config");
        
        let mut gossipsub = gossipsub::Behaviour::new(
            gossipsub::MessageAuthenticity::Signed(local_key.clone()),
            gossipsub_config,
        )?;

        // Subscribe to topics
        let block_topic = gossipsub::IdentTopic::new("excalibur-blocks");
        let tx_topic = gossipsub::IdentTopic::new("excalibur-transactions");
        gossipsub.subscribe(&block_topic)?;
        gossipsub.subscribe(&tx_topic)?;

        // Configure Kademlia
        let store = kad::store::MemoryStore::new(local_peer_id);
        let mut kad = kad::Behaviour::new(local_peer_id, store);
        
        // Add bootstrap peers to Kademlia
        for addr in bootstrap_peers {
            if let Some(peer_id) = addr.iter().find_map(|p| {
                if let libp2p::multiaddr::Protocol::P2p(peer_id) = p {
                    Some(peer_id)
                } else {
                    None
                }
            }) {
                kad.add_address(&peer_id, addr);
            }
        }

        // Configure identify
        let identify = identify::Behaviour::new(identify::Config::new(
            "/excalibur/1.0.0".to_string(),
            local_key.public(),
        ));

        // Create behaviour
        let behaviour = ExcaliburBehaviour {
            gossipsub,
            kad,
            identify,
        };

        // Create swarm
        let mut swarm = Swarm::new(
            transport,
            behaviour,
            local_peer_id,
            libp2p::swarm::Config::with_tokio_executor(),
        );

        // Listen on address
        swarm.listen_on(listen_addr)?;

        // Create channels
        let (command_sender, command_receiver) = mpsc::channel(100);
        let (event_sender, event_receiver) = mpsc::channel(100);

        let manager = NetworkManager {
            swarm,
            command_receiver,
            event_sender,
        };

        Ok((manager, command_sender, event_receiver))
    }

    /// Run the network manager
    pub async fn run(mut self) {
        loop {
            tokio::select! {
                // Handle incoming commands
                Some(command) = self.command_receiver.recv() => {
                    self.handle_command(command).await;
                }
                
                // Handle swarm events
                event = self.swarm.select_next_some() => {
                    self.handle_swarm_event(event).await;
                }
            }
        }
    }

    async fn handle_command(&mut self, command: NetworkCommand) {
        match command {
            NetworkCommand::PublishBlock(data) => {
                let topic = gossipsub::IdentTopic::new("excalibur-blocks");
                if let Err(e) = self.swarm.behaviour_mut().gossipsub.publish(topic, data) {
                    tracing::error!("Failed to publish block: {:?}", e);
                }
            }
            NetworkCommand::PublishTransaction(data) => {
                let topic = gossipsub::IdentTopic::new("excalibur-transactions");
                if let Err(e) = self.swarm.behaviour_mut().gossipsub.publish(topic, data) {
                    tracing::error!("Failed to publish transaction: {:?}", e);
                }
            }
            NetworkCommand::ConnectPeer(addr) => {
                if let Err(e) = self.swarm.dial(addr) {
                    tracing::error!("Failed to dial peer: {:?}", e);
                }
            }
            NetworkCommand::DisconnectPeer(peer_id) => {
                self.swarm.disconnect_peer_id(peer_id).ok();
            }
            NetworkCommand::GetPeers => {
                let peers: Vec<PeerId> = self.swarm.connected_peers().cloned().collect();
                let _ = self.event_sender.send(NetworkEvent::PeerList(peers)).await;
            }
        }
    }

    async fn handle_swarm_event(&mut self, event: SwarmEvent<ExcaliburBehaviourEvent>) {
        match event {
            SwarmEvent::Behaviour(ExcaliburBehaviourEvent::Gossipsub(gossipsub::Event::Message {
                message,
                ..
            })) => {
                let topic = message.topic.as_str();
                if topic == "excalibur-blocks" {
                    let _ = self.event_sender
                        .send(NetworkEvent::BlockReceived(message.data))
                        .await;
                } else if topic == "excalibur-transactions" {
                    let _ = self.event_sender
                        .send(NetworkEvent::TransactionReceived(message.data))
                        .await;
                }
            }
            SwarmEvent::ConnectionEstablished { peer_id, .. } => {
                tracing::debug!("Connected to peer: {}", peer_id);
                let _ = self.event_sender
                    .send(NetworkEvent::PeerConnected(peer_id))
                    .await;
            }
            SwarmEvent::ConnectionClosed { peer_id, .. } => {
                tracing::debug!("Disconnected from peer: {}", peer_id);
                let _ = self.event_sender
                    .send(NetworkEvent::PeerDisconnected(peer_id))
                    .await;
            }
            SwarmEvent::NewListenAddr { address, .. } => {
                tracing::info!("Listening on {}", address);
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_network_manager_creation() {
        let listen_addr = "/ip4/127.0.0.1/tcp/0".parse().unwrap();
        let result = NetworkManager::new(listen_addr, vec![]).await;
        assert!(result.is_ok());
    }
}
