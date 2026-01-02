/**
 * Revenue Service - Multi-stream revenue generation and income tracking
 */

import axios from 'axios';
import { RevenueStats, RevenueStream, UserRewardParams } from '../types';

export class RevenueService {
  private apiEndpoint: string;

  constructor(apiEndpoint: string = 'http://localhost:5000') {
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Get comprehensive revenue statistics
   */
  async getRevenueStats(): Promise<RevenueStats> {
    try {
      const response = await axios.get(`${this.apiEndpoint}/revenue/stats`);
      return response.data;
    } catch (error) {
      // Return stub data if API unavailable
      return this.getStubRevenueStats();
    }
  }

  /**
   * Calculate user rewards with multipliers
   */
  async calculateUserRewards(params: UserRewardParams): Promise<string> {
    try {
      const response = await axios.post(`${this.apiEndpoint}/revenue/calculate`, params);
      return response.data.calculated_reward;
    } catch (error) {
      // Local calculation if API unavailable
      return this.calculateRewardsLocal(params);
    }
  }

  /**
   * Local reward calculation (matches Python implementation)
   */
  private calculateRewardsLocal(params: UserRewardParams): string {
    const userStake = parseFloat(params.userStake);
    const totalStaked = parseFloat(params.totalStaked);

    if (totalStaked === 0 || userStake === 0) {
      return '0';
    }

    // Base share proportional to stake
    let baseShare = userStake / totalStaked;
    let multiplier = 1.0;

    // Long-term holder bonus
    if (params.holdingMonths >= 24) {
      multiplier *= 1.5;
    } else if (params.holdingMonths >= 12) {
      multiplier *= 1.25;
    } else if (params.holdingMonths >= 6) {
      multiplier *= 1.1;
    }

    // Active forger bonus
    if (params.forgeCount >= 100) {
      multiplier *= 1.3;
    } else if (params.forgeCount >= 50) {
      multiplier *= 1.15;
    } else if (params.forgeCount >= 10) {
      multiplier *= 1.05;
    }

    // Liquidity provider bonus
    if (params.isLp) {
      multiplier *= 1.2;
    }

    const weightedShare = baseShare * multiplier;
    return weightedShare.toFixed(8);
  }

  /**
   * Get performance metrics for a specific revenue stream
   */
  async getStreamPerformance(streamName: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiEndpoint}/revenue/stream/${streamName}`
      );
      return response.data;
    } catch (error) {
      return { error: 'Stream not found or API unavailable' };
    }
  }

  /**
   * Process revenue from a stream
   */
  async processRevenue(
    stream: string,
    amount: string,
    currency: string = '$EXS'
  ): Promise<any> {
    try {
      const response = await axios.post(`${this.apiEndpoint}/revenue/process`, {
        stream,
        amount,
        currency,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to process revenue: ${error}`);
    }
  }

  /**
   * Get all available revenue streams
   */
  getRevenueStreams(): RevenueStream[] {
    return [
      {
        name: 'cross_chain_mining',
        description: 'Mining across BTC, ETH, LTC, XMR, DOGE',
        treasuryShare: 0.4,
        userShare: 0.55,
        operationalShare: 0.05,
        estimatedApr: '8-15%',
        status: 'active',
      },
      {
        name: 'futures_trading',
        description: 'Automated futures on GMX, dYdX, Synthetix',
        treasuryShare: 0.3,
        userShare: 0.6,
        operationalShare: 0.1,
        estimatedApr: '12-25%',
        status: 'active',
      },
      {
        name: 'lightning_routing',
        description: 'P2TR Lightning channel routing fees',
        treasuryShare: 0.35,
        userShare: 0.6,
        operationalShare: 0.05,
        estimatedApr: '10-20%',
        status: 'active',
      },
      {
        name: 'taproot_processing',
        description: 'P2TR transaction batching and optimization',
        treasuryShare: 0.25,
        userShare: 0.7,
        operationalShare: 0.05,
        estimatedApr: '5-12%',
        status: 'active',
      },
      {
        name: 'yield_farming',
        description: 'Aave, Compound, Curve, Convex yield strategies',
        treasuryShare: 0.3,
        userShare: 0.65,
        operationalShare: 0.05,
        estimatedApr: '6-18%',
        status: 'active',
      },
      {
        name: 'mev_extraction',
        description: 'Flashbots and MEV-boost strategies',
        treasuryShare: 0.4,
        userShare: 0.5,
        operationalShare: 0.1,
        estimatedApr: '15-40%',
        status: 'active',
      },
      {
        name: 'staking_services',
        description: 'ETH, ADA, DOT, ATOM, SOL staking pools',
        treasuryShare: 0.2,
        userShare: 0.75,
        operationalShare: 0.05,
        estimatedApr: '4-12%',
        status: 'active',
      },
      {
        name: 'nft_royalties',
        description: 'Curated NFT collections with royalty sharing',
        treasuryShare: 0.3,
        userShare: 0.6,
        operationalShare: 0.1,
        estimatedApr: '8-25%',
        status: 'active',
      },
      {
        name: 'lending_protocol',
        description: 'Over-collateralized lending with BTC/ETH/USDC',
        treasuryShare: 0.25,
        userShare: 0.7,
        operationalShare: 0.05,
        estimatedApr: '5-15%',
        status: 'active',
      },
    ];
  }

  /**
   * Stub revenue stats for offline mode
   */
  private getStubRevenueStats(): RevenueStats {
    const streams = this.getRevenueStreams();
    const streamMap: Record<string, RevenueStream> = {};
    
    streams.forEach(stream => {
      streamMap[stream.name] = stream;
    });

    return {
      totalRevenueGenerated: '0',
      totalTreasuryCollected: '0',
      totalUserRewards: '0',
      activeStreams: streams.filter(s => s.status === 'active').length,
      totalStreams: streams.length,
      streams: streamMap,
    };
  }

  /**
   * Get income summary for user
   */
  async getIncomeSummary(address: string): Promise<any> {
    // This would query the blockchain/database in production
    return {
      address,
      totalEarned: '0.00000000',
      miningRewards: '0.00000000',
      stakingRewards: '0.00000000',
      revenueShare: '0.00000000',
      lastUpdate: new Date().toISOString(),
    };
  }

  /**
   * Estimate potential income based on parameters
   */
  estimatePotentialIncome(
    stake: number,
    miningHashRate: number,
    daysActive: number
  ): any {
    // Block reward: 50 EXS
    const blockReward = 50;
    const blocksPerDay = 144; // ~10 min blocks
    
    // Mining income (simplified)
    const dailyMiningReward = (miningHashRate / 1000) * blockReward * 0.01;
    
    // Staking income (simplified APY)
    const stakingApy = 0.08; // 8%
    const dailyStakingReward = (stake * stakingApy) / 365;
    
    // Revenue share (based on streams)
    const avgRevenueApy = 0.12; // 12%
    const dailyRevenueShare = (stake * avgRevenueApy) / 365;
    
    const totalDailyIncome = dailyMiningReward + dailyStakingReward + dailyRevenueShare;
    const projectedIncome = totalDailyIncome * daysActive;
    
    return {
      daily: {
        mining: dailyMiningReward.toFixed(8),
        staking: dailyStakingReward.toFixed(8),
        revenueShare: dailyRevenueShare.toFixed(8),
        total: totalDailyIncome.toFixed(8),
      },
      projected: {
        income: projectedIncome.toFixed(8),
        days: daysActive,
      },
      parameters: {
        stake,
        miningHashRate,
        stakingApy: `${(stakingApy * 100).toFixed(1)}%`,
        revenueApy: `${(avgRevenueApy * 100).toFixed(1)}%`,
      },
    };
  }
}
