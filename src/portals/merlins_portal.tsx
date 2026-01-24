/**
 * Merlin's Portal - Admin/Treasury Dashboard
 * 
 * The private administrative portal for managing the Excalibur $EXS treasury,
 * forge difficulty, and foundry reserves. Access is gated via the King's Vector
 * (HPP-1 hardened authentication).
 * 
 * Features:
 * - King's Vector authentication gate (HPP-1 hardened)
 * - King's Tithe dashboard (1% fee accumulation visualization)
 * - Forge Difficulty controls (Ω′ Δ18 rounds configuration)
 * - Foundry Reserve view (5% of total supply monitoring)
 * - CLTV time-locked mini-output management
 * - Treasury distribution history
 * 
 * Author: Travis D. Jones <holedozer@icloud.com>
 * License: BSD 3-Clause
 * Copyright (c) 2025, Travis D. Jones
 */

'use client';

import React, { useState, useEffect } from 'react';
import EmporiumDashboard from './components/EmporiumDashboard';
import BlockchainEvents from './components/BlockchainEvents';
import ProphecyHistory from './components/ProphecyHistory';

// HPP-1 constants
const HPP1_ITERATIONS = 600000;

interface TreasuryStats {
  treasury_balance: number;
  spendable_balance: number;
  locked_balance: number;
  spent_balance: number;
  total_fees_collected: number;
  total_forges: number;
  current_block_height: number;
  forge_fee_pool_btc: number;
  total_minted: number;
  percentage_minted: number;
  supply_cap: number;
  forge_reward: number;
  treasury_allocation: number;
  treasury_percent: number;
  distributions_count: number;
  mini_outputs_total: number;
  mini_output_amount: number;
  mini_outputs_per_block: number;
  block_interval: number;
}

interface MiniOutput {
  OutputID: number;
  BlockHeight: number;
  Amount: number;
  LockHeight: number;
  UnlockHeight: number;
  IsSpendable: boolean;
  IsSpent: boolean;
  ScriptAddress: string;
  CreatedAt: string;
}

interface Distribution {
  ID: number;
  Timestamp: string;
  Amount: number;
  Recipient: string;
  Purpose: string;
  TxHash: string;
}

export default function MerlinsPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [kingsVector, setKingsVector] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const [treasuryStats, setTreasuryStats] = useState<TreasuryStats | null>(null);
  const [miniOutputs, setMiniOutputs] = useState<MiniOutput[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'mini-outputs' | 'distributions' | 'emporium' | 'settings'>('overview');
  
  // Forge difficulty settings
  const [forgeDifficulty, setForgeDifficulty] = useState<number>(4);
  const [omegaRounds, setOmegaRounds] = useState<number>(128);

  // HPP-1 hardened authentication
  const authenticateKingsVector = async () => {
    if (!kingsVector) {
      setAuthError('Please enter the King\'s Vector');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Derive key using HPP-1 protocol (PBKDF2-HMAC-SHA512 with 600k iterations)
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(kingsVector),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const salt = encoder.encode('excalibur-exs-kings-vector-salt-v1');
      
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: HPP1_ITERATIONS,
          hash: 'SHA-512',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Export and hash the derived key
      const exportedKey = await crypto.subtle.exportKey('raw', derivedKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', exportedKey);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Verify against the expected hash (in production, this would be a secure backend check)
      // TODO: Replace with actual secure backend authentication endpoint
      const response = await fetch('/api/admin/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector_hash: hashHex,
        }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setKingsVector(''); // Clear the vector from memory
        fetchTreasuryData();
      } else {
        throw new Error('Invalid King\'s Vector. Access denied.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Fetch treasury data
  const fetchTreasuryData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, outputsRes, distsRes] = await Promise.all([
        fetch('/api/treasury/stats'),
        fetch('/api/treasury/mini-outputs'),
        fetch('/api/treasury/distributions'),
      ]);

      if (!statsRes.ok || !outputsRes.ok || !distsRes.ok) {
        throw new Error('Failed to fetch treasury data');
      }

      const stats = await statsRes.json();
      const outputs = await outputsRes.json();
      const dists = await distsRes.json();

      setTreasuryStats(stats);
      setMiniOutputs(outputs);
      setDistributions(dists);
    } catch (err: any) {
      setError(err.message || 'Failed to load treasury data');
    } finally {
      setLoading(false);
    }
  };

  // Update forge difficulty
  const updateForgeDifficulty = async () => {
    try {
      const response = await fetch('/api/admin/forge-difficulty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          difficulty: forgeDifficulty,
          rounds: omegaRounds,
        }),
      });

      if (response.ok) {
        // TODO: Replace with proper toast notification system
        alert('✅ Forge difficulty updated successfully');
      } else {
        throw new Error('Failed to update difficulty');
      }
    } catch (err: any) {
      // TODO: Replace with proper toast notification system
      alert(`❌ Error: ${err.message}`);
    }
  };

  // Authentication gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-black/40 border-2 border-indigo-500/50 rounded-lg p-8 backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-indigo-400 mb-2">
              🧙‍♂️ Merlin's Portal
            </h1>
            <p className="text-gray-400">King's Vector Required</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter King's Vector (HPP-1 Hardened)
            </label>
            <input
              type="password"
              value={kingsVector}
              onChange={(e) => setKingsVector(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && authenticateKingsVector()}
              disabled={isAuthenticating}
              className="w-full p-3 bg-slate-900/80 border border-indigo-500/50 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/50"
              placeholder="••••••••••••••••"
            />
            <p className="text-xs text-gray-500 mt-2">
              🔐 PBKDF2-HMAC-SHA512 | {HPP1_ITERATIONS.toLocaleString()} iterations
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
              ❌ {authError}
            </div>
          )}

          <button
            onClick={authenticateKingsVector}
            disabled={isAuthenticating || !kingsVector}
            className={`w-full py-3 rounded-lg font-bold transition-all ${
              isAuthenticating || !kingsVector
                ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
            }`}
          >
            {isAuthenticating ? (
              <>
                <span className="inline-block animate-spin mr-2">⚡</span>
                Authenticating...
              </>
            ) : (
              '🔓 Enter the Portal'
            )}
          </button>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              ⚠️ Authorized access only. This portal controls the King's Treasury,
              Foundry Reserve, and forge parameters.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main admin dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-5xl font-bold text-indigo-400 mb-2">
                🧙‍♂️ Merlin's Portal
              </h1>
              <p className="text-gray-400">Treasury Management & Forge Control</p>
            </div>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-all"
            >
              🚪 Exit Portal
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'mini-outputs', label: '🔐 Mini-Outputs', icon: '🔐' },
            { id: 'distributions', label: '💰 Distributions', icon: '💰' },
            { id: 'emporium', label: '🏛️ Emporium', icon: '🏛️' },
            { id: 'settings', label: '⚙️ Settings', icon: '⚙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-4xl mb-4">⚡</div>
            <p className="text-gray-400">Loading treasury data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-4 mb-8">
            <p className="text-red-400 font-semibold">❌ {error}</p>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && treasuryStats && (
          <div className="space-y-6">
            {/* King's Tithe Summary */}
            <div className="bg-black/40 border-2 border-amber-500/50 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-amber-400 mb-4">
                👑 King's Tithe (Treasury Balance)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-amber-900/20 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Total Balance</p>
                  <p className="text-3xl font-bold text-amber-300">
                    {treasuryStats.treasury_balance.toFixed(2)} $EXS
                  </p>
                </div>
                <div className="bg-green-900/20 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Spendable (Unlocked)</p>
                  <p className="text-3xl font-bold text-green-300">
                    {treasuryStats.spendable_balance.toFixed(2)} $EXS
                  </p>
                </div>
                <div className="bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Locked (CLTV)</p>
                  <p className="text-3xl font-bold text-blue-300">
                    {treasuryStats.locked_balance.toFixed(2)} $EXS
                  </p>
                </div>
              </div>
            </div>

            {/* Foundry Reserve (5% of total supply) */}
            <div className="bg-black/40 border-2 border-purple-500/50 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-purple-400 mb-4">
                🏰 Foundry Reserve (5% of Supply)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Total Supply Cap</p>
                  <p className="text-2xl font-bold text-white">
                    {treasuryStats.supply_cap.toLocaleString()} $EXS
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Foundry Reserve (5%)</p>
                  <p className="text-2xl font-bold text-purple-300">
                    {(treasuryStats.supply_cap * 0.05).toLocaleString()} $EXS
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Total Minted</p>
                  <p className="text-2xl font-bold text-white">
                    {treasuryStats.total_minted.toLocaleString()} $EXS
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Progress</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-800 rounded-full h-3">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${treasuryStats.percentage_minted}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold text-purple-300">
                      {treasuryStats.percentage_minted.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Forge Statistics */}
            <div className="bg-black/40 border-2 border-green-500/50 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-green-400 mb-4">
                ⚒️ Forge Statistics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Total Forges</p>
                  <p className="text-xl font-bold text-white">{treasuryStats.total_forges}</p>
                </div>
                <div className="bg-slate-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Block Height</p>
                  <p className="text-xl font-bold text-white">{treasuryStats.current_block_height}</p>
                </div>
                <div className="bg-slate-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Forge Fee Pool</p>
                  <p className="text-xl font-bold text-amber-300">
                    {treasuryStats.forge_fee_pool_btc.toFixed(4)} BTC
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Distributions</p>
                  <p className="text-xl font-bold text-white">{treasuryStats.distributions_count}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mini-Outputs Tab */}
        {activeTab === 'mini-outputs' && (
          <div className="bg-black/40 border-2 border-indigo-500/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-indigo-400 mb-4">
              🔐 CLTV Time-Locked Mini-Outputs
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Treasury is split into 3 mini-outputs per forge with staggered CLTV time-locks
              (0, 4,320, and 8,640 blocks).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/50 text-gray-300">
                  <tr>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Amount</th>
                    <th className="p-3 text-left">Block Height</th>
                    <th className="p-3 text-left">Unlock Height</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {miniOutputs.slice(0, 20).map((output) => (
                    <tr key={output.OutputID} className="border-t border-gray-700">
                      <td className="p-3 text-white">{output.OutputID}</td>
                      <td className="p-3 text-amber-300">{output.Amount.toFixed(1)} $EXS</td>
                      <td className="p-3 text-gray-400">{output.BlockHeight}</td>
                      <td className="p-3 text-gray-400">{output.UnlockHeight}</td>
                      <td className="p-3">
                        {output.IsSpent ? (
                          <span className="text-red-400">🔴 Spent</span>
                        ) : output.IsSpendable ? (
                          <span className="text-green-400">🟢 Spendable</span>
                        ) : (
                          <span className="text-yellow-400">🟡 Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Distributions Tab */}
        {activeTab === 'distributions' && (
          <div className="bg-black/40 border-2 border-green-500/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-4">
              💰 Treasury Distribution History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/50 text-gray-300">
                  <tr>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Amount</th>
                    <th className="p-3 text-left">Recipient</th>
                    <th className="p-3 text-left">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {distributions.map((dist) => (
                    <tr key={dist.ID} className="border-t border-gray-700">
                      <td className="p-3 text-white">{dist.ID}</td>
                      <td className="p-3 text-gray-400">
                        {new Date(dist.Timestamp).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-green-300">{dist.Amount.toFixed(2)} $EXS</td>
                      <td className="p-3 text-gray-400 font-mono text-xs">
                        {dist.Recipient.substring(0, 12)}...
                      </td>
                      <td className="p-3 text-gray-300">{dist.Purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {distributions.length === 0 && (
                <p className="text-center text-gray-500 py-8">No distributions yet</p>
              )}
            </div>
          </div>
        )}

        {/* Emporium Tab */}
        {activeTab === 'emporium' && (
          <div className="space-y-6">
            {/* Emporium Dashboard */}
            <div className="mb-8">
              <EmporiumDashboard />
            </div>

            {/* Blockchain Events & Prophecy History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BlockchainEvents limit={20} autoRefresh={true} />
              <ProphecyHistory limit={50} />
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-black/40 border-2 border-orange-500/50 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-orange-400 mb-4">
                ⚙️ Forge Difficulty Controls
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Adjust the Ω′ Δ18 mining difficulty and round count.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Difficulty (Leading Zero Bytes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={forgeDifficulty}
                    onChange={(e) => setForgeDifficulty(parseInt(e.target.value))}
                    className="w-full p-3 bg-slate-900/80 border border-orange-500/50 rounded-lg text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Current: {forgeDifficulty} bytes</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ω′ Δ18 Rounds
                  </label>
                  <input
                    type="number"
                    min="64"
                    max="256"
                    step="64"
                    value={omegaRounds}
                    onChange={(e) => setOmegaRounds(parseInt(e.target.value))}
                    className="w-full p-3 bg-slate-900/80 border border-orange-500/50 rounded-lg text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Current: {omegaRounds} rounds</p>
                </div>
              </div>
              <button
                onClick={updateForgeDifficulty}
                className="mt-4 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-all"
              >
                💾 Update Forge Parameters
              </button>
            </div>

            <div className="bg-black/40 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-300 mb-4">ℹ️ System Information</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-400">
                  <strong className="text-white">Treasury Model:</strong> 15% allocation per forge
                  (7.5 $EXS split into 3 mini-outputs)
                </p>
                <p className="text-gray-400">
                  <strong className="text-white">CLTV Locks:</strong> 0 blocks (immediate), 4,320
                  blocks (~1 month), 8,640 blocks (~2 months)
                </p>
                <p className="text-gray-400">
                  <strong className="text-white">Forge Fee:</strong> 0.0001 BTC (10,000 sats) per
                  forge
                </p>
                <p className="text-gray-400">
                  <strong className="text-white">HPP-1 Security:</strong> 600,000 PBKDF2-HMAC-SHA512
                  iterations
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
