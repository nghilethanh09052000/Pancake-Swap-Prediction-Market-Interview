'use client'

import { useAccount, useReadContract } from 'wagmi'
import { useEffect, useState } from 'react'
import { formatEther, formatUnits } from 'viem'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/config/contract'
import { BettingCard } from './BettingCard'
import { UserBets } from './UserBets'
import { RoundHistory } from './RoundHistory'

type Coin = 'BTC' | 'ETH' | 'BNB'

const COIN_TO_ENUM = {
  BTC: 0,
  ETH: 1,
  BNB: 2,
}

interface Props {
  coin: Coin
}

export function PredictionMarket({ coin }: Props) {
  const { address, isConnected } = useAccount()
  const coinEnum = COIN_TO_ENUM[coin]
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000))

  // Get current round
  const { data: currentRoundId, refetch: refetchRoundId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'currentRound',
    args: [coinEnum],
  })

  // Get LIVE round data (current - 1, the one that's locked)
  const { data: liveRoundData, refetch: refetchLiveRound } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getRound',
    args: [coinEnum, currentRoundId && currentRoundId > 1n ? currentRoundId - 1n : 1n],
    query: {
      enabled: currentRoundId !== undefined && currentRoundId > 1n,
      refetchInterval: 2000,
    },
  })

  // Get NEXT round data (current round, accepting bets)
  const { data: nextRoundData, refetch: refetchNextRound } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getRound',
    args: [coinEnum, currentRoundId || 1n],
    query: {
      enabled: currentRoundId !== undefined,
      refetchInterval: 2000,
    },
  })

  // Get current price from oracle (real-time)
  const { data: currentPrice, refetch: refetchPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCurrentPrice',
    args: [coinEnum],
    query: {
      refetchInterval: 5000,
    },
  })

  // Get user bet for NEXT round
  const { data: userBet, refetch: refetchUserBet } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserBet',
    args: [coinEnum, address || '0x0', currentRoundId || 0n],
    query: {
      enabled: isConnected && address && currentRoundId !== undefined,
    },
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000))
      refetchLiveRound()
      refetchNextRound()
      refetchRoundId()
      refetchPrice()
      refetchUserBet()
    }, 1000) // Update every second for countdown

    return () => clearInterval(interval)
  }, [refetchLiveRound, refetchNextRound, refetchRoundId, refetchPrice, refetchUserBet])

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const parseLiveRound = (data: any) => {
    if (!data) return null
    return {
      roundId: data[0],
      coin: data[1],
      startTimestamp: data[2],
      lockTimestamp: data[3],
      closeTimestamp: data[4],
      lockPrice: data[5],
      closePrice: data[6],
      totalBullAmount: data[7],
      totalBearAmount: data[8],
      oracleCalled: data[9],
      status: Number(data[10]),
    }
  }

  const parseNextRound = (data: any) => {
    if (!data) return null
    return {
      roundId: data[0],
      coin: data[1],
      startTimestamp: data[2],
      lockTimestamp: data[3],
      closeTimestamp: data[4],
      lockPrice: data[5],
      closePrice: data[6],
      totalBullAmount: data[7],
      totalBearAmount: data[8],
      oracleCalled: data[9],
      status: Number(data[10]),
    }
  }

  const liveRound = parseLiveRound(liveRoundData)
  const nextRound = parseNextRound(nextRoundData)

  if (!nextRound) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400">Loading round data...</p>
      </div>
    )
  }

  const liveTimeRemaining = liveRound ? Number(liveRound.closeTimestamp) - currentTime : 0
  const nextTimeUntilLock = Number(nextRound.lockTimestamp) - currentTime

  const calculatePriceChange = () => {
    if (!liveRound || !liveRound.lockPrice || !currentPrice) return null
    const lockPrice = Number(formatUnits(liveRound.lockPrice, 8))
    const current = Number(formatUnits(currentPrice, 8))
    const change = current - lockPrice
    const percentChange = (change / lockPrice) * 100
    return { change, percentChange, isUp: change > 0 }
  }

  const priceChange = calculatePriceChange()

  const calculatePayout = (round: any, position: 'Bull' | 'Bear') => {
    if (!round || round.totalBullAmount === 0n || round.totalBearAmount === 0n) return '0.00'
    const totalPool = round.totalBullAmount + round.totalBearAmount
    const winningPool = position === 'Bull' ? round.totalBullAmount : round.totalBearAmount
    if (winningPool === 0n) return '0.00'
    const payout = Number(formatEther(totalPool)) / Number(formatEther(winningPool))
    return payout.toFixed(2)
  }

  // Calculate progress for visual timeline
  const calculateProgress = (round: any) => {
    if (!round) return 0
    const totalDuration = Number(round.lockTimestamp) - Number(round.startTimestamp) // 5 minutes = 300 seconds
    const elapsed = currentTime - Number(round.startTimestamp)
    const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
    return progress
  }

  const nextRoundProgress = calculateProgress(nextRound)
  const ROUND_DURATION = 300 // 5 minutes in seconds

  return (
    <div className="space-y-6">
      {/* Round Timeline Indicator */}
      <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 text-center">
          ⏱️ Round Timeline - 5 Minute Intervals
        </h3>
        
        <div className="space-y-4">
          {/* Timeline Visualization */}
          <div className="relative">
            {/* Timeline Bar */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Round #{nextRound.roundId.toString()}</span>
              <span className="text-sm text-purple-400 font-semibold">
                {Math.floor(nextTimeUntilLock / 60)}:{String(nextTimeUntilLock % 60).padStart(2, '0')} until lock
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-8 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-1000"
                style={{ width: `${nextRoundProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
              
              {/* Time Labels */}
              <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-semibold text-white">
                <span>0:00</span>
                <span>1:15</span>
                <span>2:30</span>
                <span>3:45</span>
                <span>5:00 🔒</span>
              </div>
            </div>
            
            {/* Phase Labels */}
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>Betting Open</span>
              <span>Round Locks</span>
            </div>
          </div>

          {/* Live Round Info (if exists) */}
          {liveRound && liveRound.status === 1 && (
            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Round #{liveRound.roundId.toString()} (LIVE)</span>
                <span className="text-sm text-green-400 font-semibold">
                  {Math.floor(liveTimeRemaining / 60)}:{String(liveTimeRemaining % 60).padStart(2, '0')} until close
                </span>
              </div>
              
              {/* Live Progress Bar */}
              <div className="relative h-6 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="absolute h-full bg-gradient-to-r from-green-600 to-green-400"
                  style={{ width: `${Math.min((60 - liveTimeRemaining) / 60 * 100, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
                
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                  LOCKED - Closing Soon
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 text-xl">ℹ️</span>
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-blue-400 mb-1">How it works:</p>
                <ul className="space-y-1 text-xs">
                  <li>• <span className="text-purple-400">NEXT Round</span>: Open for 5 minutes - Place your bets!</li>
                  <li>• <span className="text-green-400">LIVE Round</span>: Locked for 1 minute - Watch results!</li>
                  <li>• After LIVE closes, NEXT becomes LIVE and a new NEXT round starts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Cards: LIVE and NEXT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LIVE ROUND - Locked, No Betting */}
        {liveRound && liveRound.status === 1 ? (
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 rounded-2xl p-6 border-2 border-green-500/50 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-bold text-lg">LIVE</span>
              </div>
              <span className="text-white/60 font-semibold">#{liveRound.roundId.toString()}</span>
            </div>

            {/* Countdown */}
            <div className="text-center mb-6">
              <p className="text-white/60 text-sm mb-2">Closes In</p>
              <div className="flex items-center justify-center gap-4">
                {/* Circular Progress */}
                <div className="relative w-16 h-16">
                  <svg className="transform -rotate-90 w-16 h-16">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-gray-700"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - liveTimeRemaining / 60)}`}
                      className="text-green-400 transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-green-400 font-bold">{Math.ceil(liveTimeRemaining / 60)}m</span>
                  </div>
                </div>
                
                <p className="text-5xl font-bold text-white mb-1">{formatTime(liveTimeRemaining)}</p>
              </div>
            </div>

            {/* Current Price vs Lock Price */}
            <div className="bg-black/30 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/60 text-sm">Last Price</span>
                <span className="text-white/60 text-sm">Locked Price</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <p className="text-2xl font-bold text-white">
                    ${currentPrice ? formatUnits(currentPrice, 8) : '--'}
                  </p>
                  {priceChange && (
                    <p className={`text-sm font-semibold ${priceChange.isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {priceChange.isUp ? '▲' : '▼'} ${Math.abs(priceChange.change).toFixed(2)} ({priceChange.percentChange.toFixed(2)}%)
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white/80">
                    ${formatUnits(liveRound.lockPrice || 0n, 8)}
                  </p>
                  <p className="text-sm text-white/60">at lock</p>
                </div>
              </div>
            </div>

            {/* Prize Pool */}
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-white/60 text-sm mb-2 text-center">Prize Pool</p>
              <p className="text-3xl font-bold text-white text-center">
                {formatEther((liveRound.totalBullAmount || 0n) + (liveRound.totalBearAmount || 0n))} {coin === 'BTC' ? 'BTC' : coin === 'ETH' ? 'ETH' : 'BNB'}
              </p>
              <div className="flex justify-between mt-3 text-sm">
                <div className="text-green-400">
                  <span className="font-semibold">UP:</span> {formatEther(liveRound.totalBullAmount || 0n)}
                </div>
                <div className="text-red-400">
                  <span className="font-semibold">DOWN:</span> {formatEther(liveRound.totalBearAmount || 0n)}
                </div>
              </div>
            </div>

            {/* Live Status Indicator */}
            <div className="mt-4 text-center">
              <p className="text-white/40 text-xs">🔒 Round locked - No betting allowed</p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-700/40 rounded-2xl p-6 border-2 border-gray-600/50">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">⏳</div>
                <p className="text-white/60 text-lg">Waiting for LIVE round...</p>
                <p className="text-white/40 text-sm mt-2">First round is starting</p>
              </div>
            </div>
          </div>
        )}

        {/* NEXT ROUND - Open for Betting */}
        <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-2xl p-6 border-2 border-purple-500/50 relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-purple-400 font-bold text-lg">NEXT</span>
            </div>
            <span className="text-white/60 font-semibold">#{nextRound.roundId.toString()}</span>
          </div>

          {/* Entry Countdown */}
          <div className="text-center mb-6">
            <p className="text-white/60 text-sm mb-2">Entry closes in</p>
            <div className="flex items-center justify-center gap-4">
              {/* Circular Progress */}
              <div className="relative w-16 h-16">
                <svg className="transform -rotate-90 w-16 h-16">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-gray-700"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (nextTimeUntilLock / ROUND_DURATION)}`}
                    className="text-purple-400 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-purple-400 font-bold">{Math.ceil(nextTimeUntilLock / 60)}m</span>
                </div>
              </div>
              
              <p className="text-5xl font-bold text-white mb-1">{formatTime(nextTimeUntilLock)}</p>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4 w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-1000"
                style={{ width: `${100 - (nextTimeUntilLock / ROUND_DURATION * 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>Start</span>
              <span className="text-purple-400 font-semibold">{Math.floor((ROUND_DURATION - nextTimeUntilLock) / 60)}:{String((ROUND_DURATION - nextTimeUntilLock) % 60).padStart(2, '0')} elapsed</span>
              <span>5:00</span>
            </div>
          </div>

          {/* Prize Pool */}
          <div className="bg-black/30 rounded-xl p-4 mb-4">
            <p className="text-white/60 text-sm mb-2 text-center">Prize Pool</p>
            <p className="text-3xl font-bold text-white text-center">
              {formatEther((nextRound.totalBullAmount || 0n) + (nextRound.totalBearAmount || 0n))} {coin === 'BTC' ? 'BTC' : coin === 'ETH' ? 'ETH' : 'BNB'}
            </p>
          </div>

          {/* Betting Buttons */}
          {nextRound.status === 0 && nextTimeUntilLock > 0 ? (
            <div className="space-y-3">
              <BettingCard
                coin={coin}
                coinEnum={coinEnum}
                roundId={nextRound.roundId}
                totalBull={nextRound.totalBullAmount}
                totalBear={nextRound.totalBearAmount}
                userBet={userBet}
                refetch={refetchNextRound}
                compact={true}
              />
              
              {/* Payout Info */}
              <div className="flex justify-between text-sm bg-black/30 rounded-lg p-3">
                <div className="text-center flex-1">
                  <p className="text-green-400 font-semibold">{calculatePayout(nextRound, 'Bull')}x</p>
                  <p className="text-white/60 text-xs">UP Payout</p>
                </div>
                <div className="border-l border-white/20"></div>
                <div className="text-center flex-1">
                  <p className="text-red-400 font-semibold">{calculatePayout(nextRound, 'Bear')}x</p>
                  <p className="text-white/60 text-xs">DOWN Payout</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-black/30 rounded-xl p-4 text-center">
              <p className="text-yellow-400 font-semibold">🔒 Round Locking Soon</p>
              <p className="text-white/60 text-sm mt-1">Wait for next round</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Bets */}
        <div className="lg:col-span-1">
        <UserBets
          coin={coin}
          coinEnum={coinEnum}
          userBet={userBet}
            round={nextRound}
            refetch={refetchNextRound}
          />
        </div>

        {/* Round History */}
        <div className="lg:col-span-2">
          <RoundHistory coin={coin} currentRoundId={currentRoundId} />
        </div>
      </div>
    </div>
  )
}
