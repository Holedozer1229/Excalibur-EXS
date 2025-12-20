'use client'

import { useState, useEffect } from 'react'

interface NetworkStats {
  currentBlock: number
  difficulty: string
  hashRate: string
  peers: number
  status: string
}

export default function NetworkStatus() {
  const [stats, setStats] = useState<NetworkStats>({
    currentBlock: 1000,
    difficulty: '0x00FFFFFFFFFFFFFF',
    hashRate: '125.3 TH/s',
    peers: 42,
    status: 'healthy'
  })
  const [rosettaHealth, setRosettaHealth] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchRosettaHealth = async () => {
    setIsLoading(true)
    // Mock API call - in production this would call the actual Rosetta API
    setTimeout(() => {
      setRosettaHealth({
        status: 'healthy',
        version: '0.1.0',
        network: 'mainnet',
        tetra_pow: 'active',
        hpp1_rounds: 600000
      })
      setIsLoading(false)
    }, 1000)
  }

  useEffect(() => {
    // Simulate periodic updates
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        currentBlock: prev.currentBlock + 1,
        peers: 40 + Math.floor(Math.random() * 10)
      }))
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Network Overview */}
      <div className="bg-slate-800/50 rounded-xl p-8 card-glow backdrop-blur-sm">
        <h2 className="text-3xl font-bold mb-6 text-purple-300">
          🌐 Network Status
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/30">
            <div className="text-sm text-gray-400 mb-1">Current Block</div>
            <div className="text-2xl font-bold text-white">
              #{stats.currentBlock.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/30">
            <div className="text-sm text-gray-400 mb-1">Network Hash Rate</div>
            <div className="text-2xl font-bold text-purple-400">
              {stats.hashRate}
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/30">
            <div className="text-sm text-gray-400 mb-1">Connected Peers</div>
            <div className="text-2xl font-bold text-green-400">
              {stats.peers}
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/30">
            <div className="text-sm text-gray-400 mb-1">Network Status</div>
            <div className="text-2xl font-bold text-green-400 capitalize">
              {stats.status}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-700">
          <div className="text-sm font-semibold text-gray-400 mb-2">Difficulty Target</div>
          <div className="font-mono text-sm text-purple-400 break-all">
            {stats.difficulty}
          </div>
        </div>
      </div>

      {/* Rosetta API Status */}
      <div className="bg-slate-800/50 rounded-xl p-8 card-glow backdrop-blur-sm">
        <h3 className="text-2xl font-bold mb-4 text-purple-300">
          🔌 Rosetta API Status
        </h3>
        <p className="text-gray-300 mb-4">
          Check the health and status of the Rosetta API server for exchange integration.
        </p>

        <button
          onClick={fetchRosettaHealth}
          disabled={isLoading}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            isLoading
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 card-glow'
          } text-white`}
        >
          {isLoading ? 'Checking...' : 'Check Rosetta Health'}
        </button>

        {rosettaHealth && (
          <div className="mt-6 bg-slate-900/50 rounded-lg p-6 border border-green-500/30">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-bold text-green-400">API Operational</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Version:</span>
                <span className="ml-2 text-white font-mono">{rosettaHealth.version}</span>
              </div>
              <div>
                <span className="text-gray-400">Network:</span>
                <span className="ml-2 text-white font-mono">{rosettaHealth.network}</span>
              </div>
              <div>
                <span className="text-gray-400">Tetra-PoW:</span>
                <span className="ml-2 text-purple-400 font-mono">{rosettaHealth.tetra_pow}</span>
              </div>
              <div>
                <span className="text-gray-400">HPP-1 Rounds:</span>
                <span className="ml-2 text-purple-400 font-mono">
                  {rosettaHealth.hpp1_rounds.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Protocol Information */}
      <div className="bg-slate-800/50 rounded-xl p-8 card-glow backdrop-blur-sm">
        <h3 className="text-2xl font-bold mb-4 text-purple-300">
          📋 Protocol Information
        </h3>
        
        <div className="space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="font-semibold text-purple-300 mb-2">Consensus Algorithm</h4>
            <p className="text-sm text-gray-300">
              Ω′ Δ18 Tetra-PoW with 128-round unrolled nonlinear state shifts
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="font-semibold text-purple-300 mb-2">Quantum Hardening</h4>
            <p className="text-sm text-gray-300">
              HPP-1: 600,000 rounds of PBKDF2-SHA256 for post-quantum security
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="font-semibold text-purple-300 mb-2">Address Format</h4>
            <p className="text-sm text-gray-300">
              Taproot (P2TR) with Bech32m encoding and 13-word prophecy axiom
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="font-semibold text-purple-300 mb-2">Block Time</h4>
            <p className="text-sm text-gray-300">
              Target: 10 minutes | Difficulty adjustment every 2016 blocks
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="font-semibold text-purple-300 mb-2">Maximum Supply</h4>
            <p className="text-sm text-gray-300">
              21,000,000 EXS | Halving every 210,000 blocks
            </p>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-slate-800/50 rounded-xl p-8 card-glow backdrop-blur-sm">
        <h3 className="text-xl font-bold mb-4 text-purple-300">
          🏷️ Topics & Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            'bitcoin',
            'taproot',
            'cryptography',
            'proof-of-work',
            'rosetta-api',
            'blockchain-ambiguity',
            'excalibur-esx',
            'quantum-resistant',
            'bech32m',
            'schnorr-signatures'
          ].map(tag => (
            <span
              key={tag}
              className="px-3 py-1 bg-purple-600/30 text-purple-300 rounded-full text-sm border border-purple-500/50"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
