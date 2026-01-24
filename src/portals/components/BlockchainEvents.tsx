/**
 * Blockchain Events Component
 * 
 * Displays live blockchain events for the Emporium of Man system.
 * Shows recent inscriptions, blocks, and transactions in real-time.
 * 
 * Author: Travis D. Jones <holedozer@icloud.com>
 * License: BSD 3-Clause
 * Copyright (c) 2025, Travis D. Jones
 */

'use client';

import React, { useState, useEffect } from 'react';

interface BlockchainEvent {
  event_type: string;
  block_height: number;
  timestamp: string;
  data: Record<string, any>;
}

interface BlockchainEventsProps {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function BlockchainEvents({
  limit = 50,
  autoRefresh = true,
  refreshInterval = 30000,
}: BlockchainEventsProps) {
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Fetch events
  const fetchEvents = async () => {
    try {
      const response = await fetch(`/emporium/events?limit=${limit}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch events');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchEvents, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Filter events
  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true;
    return event.event_type === filter;
  });

  // Get event icon
  const getEventIcon = (type: string): string => {
    const icons: Record<string, string> = {
      inscription: '📜',
      block: '⛓️',
      transaction: '💰',
    };
    return icons[type] || '📊';
  };

  // Get event color
  const getEventColor = (type: string): string => {
    const colors: Record<string, string> = {
      inscription: 'border-purple-500/50 bg-purple-900/20',
      block: 'border-blue-500/50 bg-blue-900/20',
      transaction: 'border-green-500/50 bg-green-900/20',
    };
    return colors[type] || 'border-gray-500/50 bg-gray-900/20';
  };

  return (
    <div className="bg-black/40 border-2 border-indigo-500/50 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-indigo-400">
          📡 Live Blockchain Events
        </h2>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-all disabled:bg-gray-600"
        >
          {loading ? '⚡ Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'inscription', 'block', 'transaction'].map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === filterType
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            {filterType === 'all' ? '🌐 All' : `${getEventIcon(filterType)} ${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Events List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getEventColor(event.event_type)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getEventIcon(event.event_type)}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white capitalize">
                      {event.event_type}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Block #{event.block_height.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
              </div>

              {/* Event Data */}
              {event.event_type === 'inscription' && event.data && (
                <div className="mt-3 space-y-1 text-sm">
                  {event.data.inscription_id && (
                    <p className="text-purple-300">
                      ID: <span className="font-mono text-xs">{event.data.inscription_id}</span>
                    </p>
                  )}
                  {event.data.vault_address && (
                    <p className="text-gray-400">
                      Vault: <span className="font-mono text-xs">{event.data.vault_address.substring(0, 20)}...</span>
                    </p>
                  )}
                  {event.data.confirmed !== undefined && (
                    <p className={event.data.confirmed ? 'text-green-400' : 'text-yellow-400'}>
                      {event.data.confirmed ? '✅ Confirmed' : '⏳ Pending'}
                    </p>
                  )}
                </div>
              )}

              {event.event_type === 'block' && event.data && (
                <div className="mt-3 text-sm text-gray-400">
                  <p>Height: <span className="text-white">{event.data.height}</span></p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            {loading ? (
              <>
                <div className="inline-block animate-spin text-4xl mb-4">⚡</div>
                <p>Loading events...</p>
              </>
            ) : (
              <p>No events found</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500 text-center">
        Showing {filteredEvents.length} of {events.length} events
        {autoRefresh && ` • Auto-refresh every ${refreshInterval / 1000}s`}
      </div>
    </div>
  );
}
