'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useEffect } from 'react'
import { formatEther, parseEther, formatUnits } from 'viem'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/config/contract'
import { BettingCard } from './BettingCard'
import { RoundInfo } from './RoundInfo'
import { UserBets } from './UserBets'

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

  // Get current round
  const { data: currentRoundId, refetch: refetchRoundId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'currentRound',
    args: [coinEnum],
  })

  // Get current round data
  const { data: roundData, refetch: refetchRound } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCurrentRound',
    args: [coinEnum],
    query: {
      enabled: currentRoundId !== undefined,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  })

  // Get current price
  const { data: currentPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCurrentPrice',
    args: [coinEnum],
    query: {
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  })

  // Get user bet if connected
  const { data: userBet } = useReadContract({
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
      refetchRound()
      refetchRoundId()
    }, 5000)

    return () => clearInterval(interval)
  }, [refetchRound, refetchRoundId])

  if (!roundData) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400">Loading round data...</p>
      </div>
    )
  }

  const round = {
    roundId: roundData[0],
    coin: roundData[1],
    startTimestamp: roundData[2],
    lockTimestamp: roundData[3],
    closeTimestamp: roundData[4],
    lockPrice: roundData[5],
    closePrice: roundData[6],
    totalBullAmount: roundData[7],
    totalBearAmount: roundData[8],
    oracleCalled: roundData[9],
    status: Number(roundData[10]),
  }

  const statusText = ['Open', 'Locked', 'Closed'][round.status] || 'Unknown'
  const timeUntilLock = Number(round.lockTimestamp) - Math.floor(Date.now() / 1000)
  const timeUntilClose = Number(round.closeTimestamp) - Math.floor(Date.now() / 1000)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Betting Area */}
      <div className="lg:col-span-2 space-y-6">
        <RoundInfo
          coin={coin}
          round={round}
          currentPrice={currentPrice}
          statusText={statusText}
          timeUntilLock={timeUntilLock}
          timeUntilClose={timeUntilClose}
        />

        {round.status === 0 && (
          <BettingCard
            coin={coin}
            coinEnum={coinEnum}
            roundId={currentRoundId || 0n}
            totalBull={round.totalBullAmount}
            totalBear={round.totalBearAmount}
            userBet={userBet}
            refetch={refetchRound}
          />
        )}

        {round.status > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Round {statusText}</h3>
            <div className="space-y-2 text-gray-300">
              <p>Lock Price: ${formatUnits(round.lockPrice || 0n, 8)}</p>
              {round.status === 2 && (
                <p>Close Price: ${formatUnits(round.closePrice || 0n, 8)}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <UserBets
          coin={coin}
          coinEnum={coinEnum}
          userBet={userBet}
          round={round}
          refetch={refetchRound}
        />
      </div>
    </div>
  )
}


