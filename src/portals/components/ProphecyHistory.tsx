/**
 * Prophecy Inscriptions History Component
 * 
 * Displays historical prophecy inscriptions with filtering and search capabilities.
 * 
 * Author: Travis D. Jones <holedozer@icloud.com>
 * License: BSD 3-Clause
 * Copyright (c) 2025, Travis D. Jones
 */

'use client';

import React, { useState, useEffect } from 'react';

interface ProphecyInscription {
  inscription_id: string;
  block_height: number;
  timestamp: string;
  axiom: string;
  prophecy_hash: string;
  vault_address: string;
  txid: string;
  confirmed: boolean;
}

interface ProphecyHistoryProps {
  limit?: number;
  confirmedOnly?: boolean;
}

export default function ProphecyHistory({
  limit = 100,
  confirmedOnly = false,
}: ProphecyHistoryProps) {
  const [inscriptions, setInscriptions] = useState<ProphecyInscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showConfirmedOnly, setShowConfirmedOnly] = useState<boolean>(confirmedOnly);

  // Fetch inscriptions
  const fetchInscriptions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/emporium/inscriptions?limit=${limit}&confirmed_only=${showConfirmedOnly}`
      );
      const data = await response.json();

      if (data.success) {
        setInscriptions(data.inscriptions);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch inscriptions');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inscriptions');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchInscriptions();
  }, [showConfirmedOnly]);

  // Filter inscriptions by search term
  const filteredInscriptions = inscriptions.filter((inscription) => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      inscription.inscription_id.toLowerCase().includes(search) ||
      inscription.vault_address.toLowerCase().includes(search) ||
      inscription.txid.toLowerCase().includes(search) ||
      inscription.axiom.toLowerCase().includes(search)
    );
  });

  return (
    <div className="bg-black/40 border-2 border-purple-500/50 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">
        📜 Prophecy Inscriptions History
      </h2>

      {/* Controls */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search inscriptions..."
          className="flex-1 min-w-[200px] p-3 bg-slate-900/80 border border-purple-500/50 rounded-lg text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50"
        />
        <button
          onClick={() => setShowConfirmedOnly(!showConfirmedOnly)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            showConfirmedOnly
              ? 'bg-green-600 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
        >
          {showConfirmedOnly ? '✅ Confirmed Only' : '🌐 Show All'}
        </button>
        <button
          onClick={fetchInscriptions}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-all disabled:bg-gray-600"
        >
          {loading ? '⚡ Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Inscriptions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 text-gray-300">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Block</th>
              <th className="p-3 text-left">Vault Address</th>
              <th className="p-3 text-left">Timestamp</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  <div className="inline-block animate-spin text-3xl mb-2">⚡</div>
                  <p>Loading inscriptions...</p>
                </td>
              </tr>
            ) : filteredInscriptions.length > 0 ? (
              filteredInscriptions.map((inscription) => (
                <tr
                  key={inscription.inscription_id}
                  className="border-t border-gray-700 hover:bg-purple-900/10 transition-colors"
                >
                  <td className="p-3 text-purple-300 font-mono text-xs">
                    {inscription.inscription_id}
                  </td>
                  <td className="p-3 text-gray-400">
                    #{inscription.block_height.toLocaleString()}
                  </td>
                  <td className="p-3 text-gray-400 font-mono text-xs">
                    {inscription.vault_address.substring(0, 16)}...
                  </td>
                  <td className="p-3 text-gray-400">
                    {new Date(inscription.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {inscription.confirmed ? (
                      <span className="text-green-400">✅ Confirmed</span>
                    ) : (
                      <span className="text-yellow-400">⏳ Pending</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  {searchTerm
                    ? 'No inscriptions match your search'
                    : 'No inscriptions found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500 text-center">
        Showing {filteredInscriptions.length} of {inscriptions.length} inscriptions
      </div>
    </div>
  );
}
