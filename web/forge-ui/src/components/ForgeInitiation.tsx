// File: web/forge-ui/src/components/ForgeInitiation.tsx
// Purpose: UI for initiating forge/mining rounds with visual Arthurian axiom display
// Integrates with: Tetra-PoW miner, Dice-Roll miner via minerService
// Displays: 13-word Arthurian axiom visually (not stored/transmitted raw)

'use client';

import React, { useState } from 'react';
import { startMining, getMinerStats } from '../services/minerService';

// Arthurian 13-word prophecy axiom - displayed visually ONLY in UI
const ARTHURIAN_AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question";

export default function ForgeInitiation() {
    const [minerType, setMinerType] = useState<'tetra-pow' | 'dice-roll'>('tetra-pow');
    const [mining, setMining] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const axiomWords = ARTHURIAN_AXIOM.split(' ');

    const handleStartForge = async () => {
        setMining(true);
        setError(null);
        setResult(null);

        try {
            // Start mining with hashed axiom (raw axiom never sent to backend)
            const response = await startMining(minerType, ARTHURIAN_AXIOM);
            setResult(response);
            
            // Fetch updated stats
            const statsData = await getMinerStats(minerType);
            setStats(statsData);
        } catch (err: any) {
            setError(err.message || 'Mining failed');
        } finally {
            setMining(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-lg shadow-2xl">
            {/* Arthurian Axiom Display */}
            <div className="mb-8 p-6 bg-black/30 rounded-lg border border-purple-500/30">
                <h2 className="text-2xl font-bold text-amber-400 mb-4 flex items-center">
                    <span className="mr-3">⚔️</span>
                    The Arthurian Prophecy
                </h2>
                
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {axiomWords.map((word, index) => (
                        <div 
                            key={index}
                            className="p-3 bg-gradient-to-r from-amber-600/20 to-purple-600/20 rounded border border-amber-500/30 text-center"
                        >
                            <span className="text-xs text-gray-400 block">{index + 1}</span>
                            <span className="text-lg font-semibold text-amber-300">{word}</span>
                        </div>
                    ))}
                </div>
                
                <p className="text-sm text-gray-400 italic">
                    🔐 This axiom is hashed before use as deterministic entropy. 
                    Never stored on-chain or transmitted raw.
                </p>
            </div>

            {/* Miner Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Mining Engine
                </label>
                <div className="flex gap-4">
                    <button
                        onClick={() => setMinerType('tetra-pow')}
                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                            minerType === 'tetra-pow'
                                ? 'border-purple-500 bg-purple-500/20 text-white'
                                : 'border-gray-600 bg-gray-800/50 text-gray-400 hover:border-purple-400'
                        }`}
                    >
                        <div className="text-lg font-bold">⚡ Tetra-PoW</div>
                        <div className="text-xs">128-round quantum-hardened</div>
                    </button>
                    
                    <button
                        onClick={() => setMinerType('dice-roll')}
                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                            minerType === 'dice-roll'
                                ? 'border-amber-500 bg-amber-500/20 text-white'
                                : 'border-gray-600 bg-gray-800/50 text-gray-400 hover:border-amber-400'
                        }`}
                    >
                        <div className="text-lg font-bold">🎲 Dice-Roll</div>
                        <div className="text-xs">Probabilistic mining</div>
                    </button>
                </div>
            </div>

            {/* Forge Button */}
            <button
                onClick={handleStartForge}
                disabled={mining}
                className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all ${
                    mining
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white shadow-lg'
                }`}
            >
                {mining ? (
                    <span className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Drawing the Sword...
                    </span>
                ) : (
                    '⚔️ Draw the Sword'
                )}
            </button>

            {/* Error Display */}
            {error && (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
                    <p className="text-red-400">❌ {error}</p>
                </div>
            )}

            {/* Mining Result */}
            {result && (
                <div className="mt-6 p-6 bg-black/40 rounded-lg border border-green-500/30">
                    <h3 className="text-xl font-bold text-green-400 mb-4">
                        {result.success ? '✅ Block Found!' : '⏳ Mining Attempt Complete'}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">Nonce:</span>
                            <span className="ml-2 text-white font-mono">{result.nonce}</span>
                        </div>
                        <div>
                            <span className="text-gray-400">Difficulty:</span>
                            <span className="ml-2 text-white">{result.difficulty}</span>
                        </div>
                        {result.block_hash && (
                            <div className="col-span-2">
                                <span className="text-gray-400">Block Hash:</span>
                                <span className="ml-2 text-green-400 font-mono text-xs break-all">
                                    {result.block_hash}
                                </span>
                            </div>
                        )}
                        {result.vault_address && (
                            <div className="col-span-2">
                                <span className="text-gray-400">P2TR Vault:</span>
                                <span className="ml-2 text-purple-400 font-mono text-xs break-all">
                                    {result.vault_address}
                                </span>
                            </div>
                        )}
                        {result.treasury_alloc && (
                            <div>
                                <span className="text-gray-400">Treasury:</span>
                                <span className="ml-2 text-amber-400">{result.treasury_alloc} EXS</span>
                            </div>
                        )}
                        {result.dice_roll !== undefined && (
                            <div>
                                <span className="text-gray-400">Dice Roll:</span>
                                <span className="ml-2 text-white">{result.dice_roll}/100</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mining Stats */}
            {stats && (
                <div className="mt-4 p-4 bg-black/30 rounded-lg border border-gray-700">
                    <h4 className="text-sm font-bold text-gray-300 mb-2">Mining Statistics</h4>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                            <span className="text-gray-500">Total Attempts:</span>
                            <span className="ml-2 text-white">{stats.total_attempts || stats.TotalAttempts || 0}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Valid Blocks:</span>
                            <span className="ml-2 text-green-400">{stats.valid_blocks || stats.ValidBlocks || 0}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Hashrate:</span>
                            <span className="ml-2 text-purple-400">
                                {(stats.hashrate || stats.Hashrate || 0).toFixed(2)} H/s
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
