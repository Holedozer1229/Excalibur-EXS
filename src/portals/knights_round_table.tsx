/**
 * Knights of the Round Table - Public Forge Portal
 * 
 * The public landing page for $EXS forging. Knights may enter the sacred
 * 13-word Arthurian Axiom to attempt drawing the Sword from the Stone.
 * 
 * Features:
 * - Interactive "Sword in the Stone" UI
 * - 13-word Axiom input validation
 * - Real-time 128-round Ω′ Δ18 mining visualization
 * - Webhook trigger for PR-based claim requests
 * 
 * Author: Travis D. Jones <holedozer@gmail.com>
 * License: BSD 3-Clause
 * Copyright (c) 2025, Travis D. Jones
 */

'use client';

import React, { useState, useEffect, useReducer, useCallback } from 'react';

// The canonical 13-word Arthurian Axiom
// NOTE: This is displayed client-side for user reference only. 
// Actual validation should be performed server-side.
const CANONICAL_AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question";

interface MiningRound {
  round: number;
  hash: string;
  timestamp: number;
}

interface MiningResult {
  success: boolean;
  nonce: number;
  finalHash: string;
  attempts: number;
  duration: number;
}

export default function KnightsRoundTable() {
  const [axiomInput, setAxiomInput] = useState<string>('');
  const [isMining, setIsMining] = useState<boolean>(false);
  const [miningProgress, setMiningProgress] = useState<number>(0);
  const [currentRound, setCurrentRound] = useState<number>(0);
  // Use useReducer for efficient batch updates
  const [roundStates, dispatchRoundStates] = useReducer(
    (state: MiningRound[], action: { type: 'ADD_ROUNDS', rounds: MiningRound[] } | { type: 'RESET' }) => {
      if (action.type === 'RESET') return [];
      if (action.type === 'ADD_ROUNDS') return [...state, ...action.rounds];
      return state;
    },
    []
  );
  const [miningResult, setMiningResult] = useState<MiningResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showClaimForm, setShowClaimForm] = useState<boolean>(false);

  const axiomWords = CANONICAL_AXIOM.split(' ');
  const userWords = axiomInput.toLowerCase().trim().split(/\s+/);
  const isAxiomValid = userWords.length === 13 && userWords.join(' ') === CANONICAL_AXIOM;

  // Simulate the 128-round Ω′ Δ18 mining process
  const startForge = useCallback(async () => {
    if (!isAxiomValid) {
      setError('The Axiom does not match the sacred prophecy. The Sword remains in the Stone.');
      return;
    }

    setIsMining(true);
    setError(null);
    setMiningResult(null);
    dispatchRoundStates({ type: 'RESET' });
    setCurrentRound(0);
    setMiningProgress(0);

    const startTime = Date.now();
    const rounds: MiningRound[] = [];
    const totalRounds = 128;

    try {
      // Call the mining API endpoint
      const response = await fetch('/api/forge/mine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          axiom: axiomInput.toLowerCase().trim(),
          minerType: 'tetra-pow',
          difficulty: 4,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mining failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Batch generate all rounds first to avoid triggering 128 re-renders
      const batchSize = 16; // Update UI every 16 rounds for smoother experience
      let lastBatchIndex = 0;
      
      for (let i = 0; i < totalRounds; i++) {
        const roundHash = await generateRoundHash(axiomInput, i);
        const round: MiningRound = {
          round: i + 1,
          hash: roundHash,
          timestamp: Date.now(),
        };
        
        rounds.push(round);
        
        // Batch update state every 16 rounds instead of every round
        if ((i + 1) % batchSize === 0 || i === totalRounds - 1) {
          setCurrentRound(i + 1);
          setMiningProgress(((i + 1) / totalRounds) * 100);
          const batchToAdd = rounds.slice(lastBatchIndex);
          dispatchRoundStates({ type: 'ADD_ROUNDS', rounds: batchToAdd });
          lastBatchIndex = i + 1;
          
          // Reduce delay for better UX
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      setMiningResult({
        success: result.success || false,
        nonce: result.nonce || 0,
        finalHash: result.block_hash || result.hash || '',
        attempts: result.attempts || 1,
        duration: duration,
      });

      if (result.success) {
        setShowClaimForm(true);
      }
    } catch (err: any) {
      setError(err.message || 'The forge has failed. Try again, brave knight.');
    } finally {
      setIsMining(false);
    }
  }, [isAxiomValid, axiomInput]);

  // Generate a simulated round hash for visualization
  const generateRoundHash = async (input: string, round: number): Promise<string> => {
    const data = `${input}:${round}:${Date.now()}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Submit a claim request via webhook (PR-based)
  const submitClaimRequest = async () => {
    if (!miningResult?.success) return;

    try {
      const response = await fetch('/api/forge/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nonce: miningResult.nonce,
          hash: miningResult.finalHash,
          axiom_hash: await generateRoundHash(axiomInput, 0),
          timestamp: Date.now(),
        }),
      });

      if (response.ok) {
        // TODO: Replace with proper toast notification system
        alert('🎉 Claim request submitted! A Pull Request will be created for verification.');
      } else {
        throw new Error('Failed to submit claim request');
      }
    } catch (err: any) {
      setError(`Claim submission failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-6xl font-bold text-amber-400 mb-4 drop-shadow-lg">
            ⚔️ Knights of the Round Table
          </h1>
          <p className="text-2xl text-purple-300 mb-2">
            The Sword in the Stone Awaits
          </p>
          <p className="text-sm text-gray-400">
            Enter the 13-word Arthurian Axiom to attempt the forging
          </p>
        </header>

        {/* Sacred Axiom Display */}
        <div className="bg-black/40 border-2 border-amber-500/50 rounded-lg p-8 mb-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-amber-400 mb-4 text-center">
            📜 The Sacred Prophecy
          </h2>
          <div className="grid grid-cols-4 md:grid-cols-5 gap-2 mb-6">
            {axiomWords.map((word, index) => (
              <div
                key={index}
                className="p-2 bg-gradient-to-br from-amber-600/20 to-purple-600/20 rounded border border-amber-500/30 text-center"
              >
                <span className="text-xs text-gray-400 block">{index + 1}</span>
                <span className="text-sm md:text-base font-semibold text-amber-300">
                  {word}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center italic">
            Only those who know the sacred words may draw the Sword
          </p>
        </div>

        {/* Axiom Input */}
        <div className="bg-black/40 border-2 border-purple-500/50 rounded-lg p-6 mb-8">
          <label className="block text-lg font-bold text-purple-300 mb-3">
            🗡️ Enter the 13-Word Axiom
          </label>
          <textarea
            value={axiomInput}
            onChange={(e) => setAxiomInput(e.target.value)}
            disabled={isMining}
            placeholder="sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
            className="w-full p-4 bg-slate-900/80 border border-purple-500/50 rounded-lg text-white font-mono text-sm resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50"
            rows={3}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className={`text-sm ${isAxiomValid ? 'text-green-400' : 'text-gray-500'}`}>
              {userWords.length}/13 words
              {isAxiomValid && ' ✓'}
            </span>
            <button
              onClick={startForge}
              disabled={!isAxiomValid || isMining}
              className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
                !isAxiomValid || isMining
                  ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                  : 'bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-700 hover:to-purple-700 text-white shadow-lg hover:shadow-amber-500/50'
              }`}
            >
              {isMining ? (
                <>
                  <span className="inline-block animate-spin mr-2">⚔️</span>
                  Drawing the Sword...
                </>
              ) : (
                '⚔️ Draw the Sword from the Stone'
              )}
            </button>
          </div>
        </div>

        {/* Mining Progress */}
        {isMining && (
          <div className="bg-black/40 border-2 border-blue-500/50 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-blue-300 mb-4">
              ⚡ Ω′ Δ18 Tetra-PoW Mining in Progress
            </h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Round {currentRound}/128</span>
                <span>{miningProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                  style={{ width: `${miningProgress}%` }}
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto bg-slate-900/50 rounded p-3 font-mono text-xs">
              {roundStates.slice(-10).map((round, idx) => (
                <div key={idx} className="text-gray-400 mb-1">
                  <span className="text-blue-400">Round {round.round}:</span>{' '}
                  <span className="text-gray-500">{round.hash.substring(0, 16)}...</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-4 mb-8">
            <p className="text-red-400 font-semibold">❌ {error}</p>
          </div>
        )}

        {/* Mining Result */}
        {miningResult && (
          <div
            className={`border-2 rounded-lg p-6 mb-8 ${
              miningResult.success
                ? 'bg-green-900/20 border-green-500'
                : 'bg-yellow-900/20 border-yellow-500'
            }`}
          >
            <h3
              className={`text-2xl font-bold mb-4 ${
                miningResult.success ? 'text-green-400' : 'text-yellow-400'
              }`}
            >
              {miningResult.success
                ? '✅ The Sword Has Been Drawn!'
                : '⏳ Forge Attempt Complete'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Nonce:</span>
                <span className="ml-2 text-white font-mono">{miningResult.nonce}</span>
              </div>
              <div>
                <span className="text-gray-400">Attempts:</span>
                <span className="ml-2 text-white">{miningResult.attempts}</span>
              </div>
              <div>
                <span className="text-gray-400">Duration:</span>
                <span className="ml-2 text-white">{miningResult.duration.toFixed(2)}s</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-gray-400">Block Hash:</span>
                <div className="mt-1 p-2 bg-slate-900/50 rounded font-mono text-xs break-all text-green-400">
                  {miningResult.finalHash}
                </div>
              </div>
            </div>

            {miningResult.success && showClaimForm && (
              <div className="mt-6 pt-6 border-t border-green-500/30">
                <h4 className="text-lg font-bold text-green-300 mb-3">
                  🎉 Submit Your Claim
                </h4>
                <p className="text-sm text-gray-400 mb-4">
                  Your successful forge will be submitted as a Pull Request for verification
                  by the Foundry guardians.
                </p>
                <button
                  onClick={submitClaimRequest}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all"
                >
                  📝 Submit Claim Request
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info Panel */}
        <div className="bg-black/40 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-300 mb-4">ℹ️ About the Forge</h3>
          <div className="space-y-3 text-sm text-gray-400">
            <p>
              <strong className="text-white">Ω′ Δ18 Tetra-PoW:</strong> A 128-round unrolled
              quantum-hardened mining algorithm.
            </p>
            <p>
              <strong className="text-white">HPP-1 Protocol:</strong> 600,000 PBKDF2-HMAC-SHA512
              iterations for maximum security.
            </p>
            <p>
              <strong className="text-white">Forge Fee:</strong> 10,000 sats per forge attempt
              (0.0001 BTC).
            </p>
            <p>
              <strong className="text-white">Treasury Allocation:</strong> 1% of all minted $EXS
              goes to the King's Treasury.
            </p>
            <p>
              <strong className="text-white">Claim Process:</strong> Successful forges are
              submitted via Pull Request for on-chain verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
