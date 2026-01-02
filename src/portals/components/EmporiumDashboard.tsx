/**
 * Emporium Dashboard Component
 * 
 * Main dashboard for the Emporium of Man functionality within Merlin's Portal.
 * Displays Sovereign Vault status, Grail achievements, blockchain events, and prophecy history.
 * 
 * Author: Travis D. Jones <holedozer@gmail.com>
 * License: BSD 3-Clause
 * Copyright (c) 2025, Travis D. Jones
 */

'use client';

import React, { useState, useEffect } from 'react';

interface VaultData {
  vault_id: string;
  owner_address: string;
  balance: string;
  grail_level: string;
  ergotropy: string;
  total_forges: number;
  total_prophecies: number;
  locked: boolean;
  achievements: string[];
}

interface NextLevelInfo {
  level: string;
  threshold: string;
  progress: string;
  remaining: string;
}

interface Achievement {
  achievement_id: string;
  name: string;
  description: string;
  ergotropy_reward: string;
  unlocked_at?: string;
}

interface Quest {
  quest_id: string;
  name: string;
  description: string;
  requirements: Record<string, number>;
  rewards: Record<string, string>;
  progress?: Record<string, any>;
}

interface VaultStatus {
  vault: VaultData;
  next_level?: NextLevelInfo;
  recent_achievements: Achievement[];
  active_quests: Quest[];
}

export default function EmporiumDashboard() {
  const [vaultId, setVaultId] = useState<string>('');
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'quests' | 'leaderboard'>('overview');

  // Fetch vault status
  const fetchVaultStatus = async () => {
    if (!vaultId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/emporium/vault/${vaultId}`);
      const data = await response.json();

      if (data.success) {
        setVaultStatus(data.data);
      } else {
        setError(data.error || 'Failed to fetch vault status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vault status');
    } finally {
      setLoading(false);
    }
  };

  // Grail level colors
  const getGrailLevelColor = (level: string): string => {
    const colors: Record<string, string> = {
      novice: 'text-gray-400',
      apprentice: 'text-blue-400',
      adept: 'text-purple-400',
      master: 'text-amber-400',
      grandmaster: 'text-red-400',
      sovereign: 'text-emerald-400',
    };
    return colors[level.toLowerCase()] || 'text-gray-400';
  };

  const getGrailLevelBg = (level: string): string => {
    const colors: Record<string, string> = {
      novice: 'bg-gray-900/20',
      apprentice: 'bg-blue-900/20',
      adept: 'bg-purple-900/20',
      master: 'bg-amber-900/20',
      grandmaster: 'bg-red-900/20',
      sovereign: 'bg-emerald-900/20',
    };
    return colors[level.toLowerCase()] || 'bg-gray-900/20';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-5xl font-bold text-purple-400 mb-2">
            🏛️ Emporium of Man
          </h1>
          <p className="text-gray-400">Sovereign Vault & Grail Management</p>
        </header>

        {/* Vault ID Input */}
        {!vaultStatus && (
          <div className="bg-black/40 border-2 border-purple-500/50 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">
              🔑 Access Your Sovereign Vault
            </h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={vaultId}
                onChange={(e) => setVaultId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchVaultStatus()}
                placeholder="Enter Vault ID"
                className="flex-1 p-3 bg-slate-900/80 border border-purple-500/50 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50"
              />
              <button
                onClick={fetchVaultStatus}
                disabled={loading || !vaultId}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  loading || !vaultId
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                }`}
              >
                {loading ? '⚡ Loading...' : '🔓 Access Vault'}
              </button>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
                ❌ {error}
              </div>
            )}
          </div>
        )}

        {/* Vault Dashboard */}
        {vaultStatus && (
          <>
            {/* Navigation Tabs */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {[
                { id: 'overview', label: '📊 Overview', icon: '📊' },
                { id: 'quests', label: '⚔️ Quests', icon: '⚔️' },
                { id: 'leaderboard', label: '🏆 Leaderboard', icon: '🏆' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                onClick={() => setVaultStatus(null)}
                className="ml-auto px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-all"
              >
                🚪 Exit Vault
              </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Vault Summary */}
                <div className="bg-black/40 border-2 border-purple-500/50 rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-purple-400 mb-4">
                    🏰 Sovereign Vault Status
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-amber-900/20 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Balance</p>
                      <p className="text-3xl font-bold text-amber-300">
                        {parseFloat(vaultStatus.vault.balance).toFixed(2)} $EXS
                      </p>
                    </div>
                    <div className={`${getGrailLevelBg(vaultStatus.vault.grail_level)} rounded-lg p-4`}>
                      <p className="text-sm text-gray-400 mb-1">Grail Level</p>
                      <p className={`text-3xl font-bold capitalize ${getGrailLevelColor(vaultStatus.vault.grail_level)}`}>
                        {vaultStatus.vault.grail_level}
                      </p>
                    </div>
                    <div className="bg-purple-900/20 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Ergotropy</p>
                      <p className="text-3xl font-bold text-purple-300">
                        {parseFloat(vaultStatus.vault.ergotropy).toFixed(0)}
                      </p>
                    </div>
                  </div>

                  {/* Progress to Next Level */}
                  {vaultStatus.next_level && (
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-400">
                          Progress to <span className="capitalize font-bold">{vaultStatus.next_level.level}</span>
                        </p>
                        <p className="text-sm text-purple-300">
                          {vaultStatus.next_level.progress} / {vaultStatus.next_level.threshold}
                        </p>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-4">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                          style={{
                            width: `${
                              (parseFloat(vaultStatus.next_level.progress) /
                                parseFloat(vaultStatus.next_level.threshold)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {vaultStatus.next_level.remaining} ergotropy remaining
                      </p>
                    </div>
                  )}
                </div>

                {/* Activity Stats */}
                <div className="bg-black/40 border-2 border-blue-500/50 rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-blue-400 mb-4">
                    📈 Activity Statistics
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 rounded p-3">
                      <p className="text-xs text-gray-400 mb-1">Total Forges</p>
                      <p className="text-xl font-bold text-white">{vaultStatus.vault.total_forges}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-3">
                      <p className="text-xs text-gray-400 mb-1">Prophecies</p>
                      <p className="text-xl font-bold text-white">{vaultStatus.vault.total_prophecies}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-3">
                      <p className="text-xs text-gray-400 mb-1">Achievements</p>
                      <p className="text-xl font-bold text-amber-300">
                        {vaultStatus.vault.achievements.length}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-3">
                      <p className="text-xs text-gray-400 mb-1">Status</p>
                      <p className={`text-xl font-bold ${vaultStatus.vault.locked ? 'text-red-400' : 'text-green-400'}`}>
                        {vaultStatus.vault.locked ? '🔒 Locked' : '🔓 Active'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Achievements */}
                {vaultStatus.recent_achievements.length > 0 && (
                  <div className="bg-black/40 border-2 border-amber-500/50 rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-amber-400 mb-4">
                      🏆 Recent Achievements
                    </h2>
                    <div className="space-y-3">
                      {vaultStatus.recent_achievements.map((achievement) => (
                        <div
                          key={achievement.achievement_id}
                          className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-bold text-amber-300">{achievement.name}</h3>
                              <p className="text-sm text-gray-400">{achievement.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-purple-300">
                                +{achievement.ergotropy_reward} Ergotropy
                              </p>
                              {achievement.unlocked_at && (
                                <p className="text-xs text-gray-500">
                                  {new Date(achievement.unlocked_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quests Tab */}
            {activeTab === 'quests' && (
              <div className="space-y-6">
                <div className="bg-black/40 border-2 border-green-500/50 rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-green-400 mb-4">
                    ⚔️ Active Quests
                  </h2>
                  {vaultStatus.active_quests.length > 0 ? (
                    <div className="space-y-4">
                      {vaultStatus.active_quests.map((quest) => (
                        <div
                          key={quest.quest_id}
                          className="bg-slate-900/50 border border-green-500/30 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-lg font-bold text-green-300">{quest.name}</h3>
                              <p className="text-sm text-gray-400">{quest.description}</p>
                            </div>
                            <div className="text-right">
                              {Object.entries(quest.rewards).map(([type, value]) => (
                                <p key={type} className="text-sm text-amber-300">
                                  +{value} {type === 'ergotropy' ? 'Ergotropy' : '$EXS'}
                                </p>
                              ))}
                            </div>
                          </div>
                          
                          {/* Quest Progress */}
                          {quest.progress && (
                            <div className="space-y-2">
                              {Object.entries(quest.progress).map(([key, prog]: [string, any]) => (
                                <div key={key}>
                                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span className="capitalize">{key}</span>
                                    <span>
                                      {prog.current} / {prog.required}
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-800 rounded-full h-2">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        prog.complete
                                          ? 'bg-green-500'
                                          : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                      }`}
                                      style={{
                                        width: `${Math.min(
                                          (parseInt(prog.current) / parseInt(prog.required)) * 100,
                                          100
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">No active quests</p>
                  )}
                </div>
              </div>
            )}

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
              <div className="bg-black/40 border-2 border-yellow-500/50 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                  🏆 Grail Leaderboard
                </h2>
                <p className="text-center text-gray-500 py-8">
                  Leaderboard functionality coming soon...
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
