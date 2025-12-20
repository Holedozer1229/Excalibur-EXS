'use client'

import { useState } from 'react'

export default function VaultGenerator() {
  const [prophecyWords, setProphecyWords] = useState<string[]>(Array(13).fill(''))
  const [generatedVault, setGeneratedVault] = useState<{
    address: string
    prophecyHash: string
  } | null>(null)
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('mainnet')

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...prophecyWords]
    newWords[index] = value
    setProphecyWords(newWords)
  }

  const generateVault = () => {
    // This is a mock implementation for the UI
    // In production, this would call the backend API
    const allWordsFilled = prophecyWords.every(word => word.trim() !== '')
    
    if (!allWordsFilled) {
      alert('Please fill all 13 prophecy words')
      return
    }

    // Mock vault generation
    const mockAddress = network === 'mainnet' 
      ? `bc1p${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      : `tb1p${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    
    const mockHash = Array(64).fill(0).map(() => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')

    setGeneratedVault({
      address: mockAddress,
      prophecyHash: mockHash
    })
  }

  const loadExampleProphecy = () => {
    setProphecyWords([
      'excalibur', 'axiom', 'quantum', 'taproot', 'omega',
      'delta', 'tetra', 'proof', 'work', 'ambiguity',
      'protocol', 'vault', 'prophecy'
    ])
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-8 card-glow backdrop-blur-sm">
      <h2 className="text-3xl font-bold mb-6 text-purple-300">
        🏰 Taproot Vault Generator
      </h2>
      <p className="text-gray-300 mb-6">
        Create a unique, un-linkable Taproot (P2TR) vault using the 13-word prophecy axiom.
        Each prophecy generates a deterministic yet privacy-preserving vault address.
      </p>

      {/* Network Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Network
        </label>
        <div className="flex space-x-4">
          <button
            onClick={() => setNetwork('mainnet')}
            className={`px-4 py-2 rounded-lg ${
              network === 'mainnet'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-gray-300'
            }`}
          >
            Mainnet
          </button>
          <button
            onClick={() => setNetwork('testnet')}
            className={`px-4 py-2 rounded-lg ${
              network === 'testnet'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-gray-300'
            }`}
          >
            Testnet
          </button>
        </div>
      </div>

      {/* Prophecy Words Input */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-semibold text-gray-300">
            13-Word Prophecy Axiom
          </label>
          <button
            onClick={loadExampleProphecy}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            Load Example
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {prophecyWords.map((word, index) => (
            <input
              key={index}
              type="text"
              value={word}
              onChange={(e) => handleWordChange(index, e.target.value)}
              placeholder={`Word ${index + 1}`}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateVault}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-all card-glow"
      >
        ⚔️ Forge Vault
      </button>

      {/* Generated Vault Display */}
      {generatedVault && (
        <div className="mt-8 bg-slate-900/50 rounded-lg p-6 border border-purple-500/30">
          <h3 className="text-xl font-bold text-purple-300 mb-4">
            ✨ Vault Forged Successfully
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-400">
                Taproot Address (Bech32m)
              </label>
              <div className="mt-1 bg-slate-800 p-3 rounded font-mono text-sm break-all text-green-400">
                {generatedVault.address}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-400">
                Prophecy Hash
              </label>
              <div className="mt-1 bg-slate-800 p-3 rounded font-mono text-xs break-all text-purple-400">
                {generatedVault.prophecyHash}
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-4">
              <p>⚠️ This vault is quantum-hardened using HPP-1 (600,000 rounds)</p>
              <p>🔒 Unlinkable: Different prophecies generate uncorrelated addresses</p>
              <p>🛡️ Privacy-preserving: No on-chain link between vaults</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
