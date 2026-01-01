// File: web/forge-ui/src/components/TreasuryVisualization.tsx
// Purpose: Visualize staggered mini-output treasury releases with CLTV schedule
// Integrates with: Treasury API, displays rolling 12-month release timeline

'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TREASURY_URL = process.env.NEXT_PUBLIC_TREASURY_URL || 'http://localhost:8080';

interface MiniOutput {
    OutputID: number;
    BlockHeight: number;
    Amount: number;
    UnlockHeight: number;
    IsSpendable: boolean;
    IsSpent: boolean;
    ScriptAddress: string;
    CreatedAt: string;
}

export default function TreasuryVisualization() {
    const [miniOutputs, setMiniOutputs] = useState<MiniOutput[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTreasuryData();
        const interval = setInterval(fetchTreasuryData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchTreasuryData = async () => {
        try {
            const [outputsRes, statsRes] = await Promise.all([
                axios.get(`${TREASURY_URL}/mini-outputs`),
                axios.get(`${TREASURY_URL}/stats`)
            ]);
            
            setMiniOutputs(outputsRes.data.mini_outputs || []);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to fetch treasury data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full max-w-6xl mx-auto p-6 bg-slate-900 rounded-lg">
                <div className="animate-pulse text-gray-400">Loading treasury data...</div>
            </div>
        );
    }

    const spendableOutputs = miniOutputs.filter(o => o.IsSpendable && !o.IsSpent);
    const lockedOutputs = miniOutputs.filter(o => !o.IsSpendable && !o.IsSpent);
    const spentOutputs = miniOutputs.filter(o => o.IsSpent);

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            {/* Treasury Summary */}
            <div className="p-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-lg shadow-2xl">
                <h2 className="text-3xl font-bold text-amber-400 mb-6 flex items-center">
                    <span className="mr-3">🏛️</span>
                    Treasury Overview
                    <span className="ml-auto text-sm text-gray-400">
                        Block {stats?.current_block_height || 'N/A'}
                    </span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-black/40 rounded-lg border border-green-500/30">
                        <div className="text-sm text-gray-400 mb-1">Total Balance</div>
                        <div className="text-3xl font-bold text-white">
                            {stats?.treasury_balance?.toFixed(2) || '0.00'} EXS
                        </div>
                    </div>
                    
                    <div className="p-4 bg-black/40 rounded-lg border border-purple-500/30">
                        <div className="text-sm text-gray-400 mb-1">🔓 Spendable</div>
                        <div className="text-3xl font-bold text-green-400">
                            {stats?.spendable_balance?.toFixed(2) || '0.00'} EXS
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {spendableOutputs.length} outputs
                        </div>
                    </div>
                    
                    <div className="p-4 bg-black/40 rounded-lg border border-amber-500/30">
                        <div className="text-sm text-gray-400 mb-1">🔒 Locked (CLTV)</div>
                        <div className="text-3xl font-bold text-amber-400">
                            {stats?.locked_balance?.toFixed(2) || '0.00'} EXS
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {lockedOutputs.length} outputs
                        </div>
                    </div>
                </div>

                {/* Mini-Output Stats */}
                <div className="p-4 bg-black/30 rounded-lg border border-gray-700">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">Total Mini-Outputs:</span>
                            <span className="ml-2 text-white font-bold">
                                {stats?.mini_outputs_total || 0}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Per Block:</span>
                            <span className="ml-2 text-purple-400 font-bold">
                                {stats?.mini_outputs_per_block || 3}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Each Output:</span>
                            <span className="ml-2 text-amber-400 font-bold">
                                {stats?.mini_output_amount || 2.5} EXS
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Block Interval:</span>
                            <span className="ml-2 text-blue-400 font-bold">
                                {stats?.block_interval || 4320} blocks
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upcoming CLTV Unlocks Timeline */}
            <div className="p-6 bg-slate-900 rounded-lg shadow-2xl">
                <h3 className="text-2xl font-bold text-purple-400 mb-4 flex items-center">
                    <span className="mr-3">📅</span>
                    Upcoming CLTV Unlocks
                </h3>
                
                {lockedOutputs.length > 0 ? (
                    <div className="space-y-2">
                        {lockedOutputs
                            .sort((a, b) => a.UnlockHeight - b.UnlockHeight)
                            .slice(0, 10)
                            .map((output) => {
                                const blocksRemaining = output.UnlockHeight - (stats?.current_block_height || 0);
                                const daysRemaining = (blocksRemaining / 144).toFixed(1); // ~144 blocks/day
                                
                                return (
                                    <div 
                                        key={output.OutputID}
                                        className="p-3 bg-black/40 rounded border border-amber-500/20 flex items-center justify-between"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="text-2xl">🔒</div>
                                            <div>
                                                <div className="font-bold text-white">
                                                    {output.Amount} EXS
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Output #{output.OutputID}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="text-right">
                                            <div className="text-sm text-amber-400 font-bold">
                                                Block {output.UnlockHeight}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                ~{daysRemaining} days ({blocksRemaining} blocks)
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="text-gray-400 text-center py-8">
                        No locked outputs. All treasury funds are spendable.
                    </div>
                )}
            </div>

            {/* Recent Outputs Grid */}
            <div className="p-6 bg-slate-900 rounded-lg shadow-2xl">
                <h3 className="text-2xl font-bold text-green-400 mb-4 flex items-center">
                    <span className="mr-3">💎</span>
                    Recent Mini-Outputs
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {miniOutputs
                        .slice(-9)
                        .reverse()
                        .map((output) => (
                            <div 
                                key={output.OutputID}
                                className={`p-4 rounded-lg border-2 ${
                                    output.IsSpent 
                                        ? 'border-gray-600 bg-gray-800/30'
                                        : output.IsSpendable
                                        ? 'border-green-500/50 bg-green-900/20'
                                        : 'border-amber-500/50 bg-amber-900/20'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xl">
                                        {output.IsSpent ? '✅' : output.IsSpendable ? '🔓' : '🔒'}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        #{output.OutputID}
                                    </div>
                                </div>
                                
                                <div className="font-bold text-white mb-1">
                                    {output.Amount} EXS
                                </div>
                                
                                <div className="text-xs text-gray-400 space-y-1">
                                    <div>Created: Block {output.BlockHeight}</div>
                                    <div>Unlocks: Block {output.UnlockHeight}</div>
                                    <div className="font-mono text-[10px] truncate">
                                        {output.ScriptAddress}
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
