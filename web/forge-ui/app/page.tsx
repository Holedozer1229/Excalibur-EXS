'use client'

import { useState } from 'react'
import VaultGenerator from '@/components/VaultGenerator'
import MinerDashboard from '@/components/MinerDashboard'
import NetworkStatus from '@/components/NetworkStatus'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'vault' | 'miner' | 'network'>('vault')

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 glow">
            ⚔️ Arthurian Forge
          </h1>
          <p className="text-xl text-purple-300">
            The Excalibur Anomaly Protocol ($EXS)
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Quantum-Hardened | Tetra-PoW | Taproot Vaults
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('vault')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'vault'
                ? 'bg-purple-600 text-white card-glow'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            🏰 Vault Generator
          </button>
          <button
            onClick={() => setActiveTab('miner')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'miner'
                ? 'bg-purple-600 text-white card-glow'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            ⛏️ Miner
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'network'
                ? 'bg-purple-600 text-white card-glow'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            🌐 Network
          </button>
        </div>

        {/* Content */}
        <div className="transition-all duration-300">
          {activeTab === 'vault' && <VaultGenerator />}
          {activeTab === 'miner' && <MinerDashboard />}
          {activeTab === 'network' && <NetworkStatus />}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>Ω′ Δ18 Tetra-PoW | HPP-1 (600,000 rounds) | 13-Word Prophecy Axiom</p>
          <p className="mt-2">
            <a 
              href="https://github.com/Holedozer1229/Excalibur-ESX" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300"
            >
              GitHub Repository
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
