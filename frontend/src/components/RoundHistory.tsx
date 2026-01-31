'use client'

import { useReadContract } from 'wagmi'
import { formatEther, formatUnits } from 'viem'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/config/contract'
import { useEffect, useState } from 'react'

type Coin = 'BTC' | 'ETH' | 'BNB'

const COIN_TO_ENUM = {
  BTC: 0,
  ETH: 1,
  BNB: 2,
}

interface Props {
  coin: Coin
  currentRoundId: bigint | undefined
}

export function RoundHistory({ coin, currentRoundId }: Props) {
  const coinEnum = COIN_TO_ENUM[coin]
  const [roundsToShow, setRoundsToShow] = useState<bigint[]>([])

  useEffect(() => {
    if (currentRoundId && currentRoundId > 1n) {
      // Show last 5 COMPLETED rounds (not including current round)
      const rounds: bigint[] = []
      const endRound = currentRoundId - 1n
      const startRound = endRound > 5n ? endRound - 4n : 1n
      for (let i = endRound; i >= startRound && i > 0n; i--) {
        rounds.push(i)
      }
      setRoundsToShow(rounds) // Most recent first
    }
  }, [currentRoundId])

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">📜 Completed Rounds</h3>
      <div className="space-y-3">
        {roundsToShow.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No completed rounds yet</p>
        ) : (
          roundsToShow.map((roundId) => (
            <RoundCard key={roundId.toString()} coin={coin} coinEnum={coinEnum} roundId={roundId} currentRoundId={currentRoundId} />
          ))
        )}
      </div>
    </div>
  )
}

function RoundCard({ 
  coin, 
  coinEnum, 
  roundId, 
  currentRoundId 
}: { 
  coin: Coin
  coinEnum: number
  roundId: bigint
  currentRoundId: bigint | undefined
}) {
  const { data: roundData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getRound',
    args: [coinEnum, roundId],
  })

  if (!roundData) {
    return (
      <div className="bg-gray-700 rounded p-3 animate-pulse">
        <div className="h-4 bg-gray-600 rounded w-1/3"></div>
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
  const isCurrentRound = currentRoundId ? roundId === currentRoundId : false
  
  // Calculate winner
  let winner: 'Bull' | 'Bear' | 'Tie' | null = null
  let priceChange = 0
  
  if (round.status === 2 && round.closePrice && round.lockPrice) {
    if (round.closePrice > round.lockPrice) {
      winner = 'Bull'
    } else if (round.closePrice < round.lockPrice) {
      winner = 'Bear'
    } else {
      winner = 'Tie'
    }
    const lockPriceNum = Number(formatUnits(round.lockPrice, 8))
    const closePriceNum = Number(formatUnits(round.closePrice, 8))
    priceChange = ((closePriceNum - lockPriceNum) / lockPriceNum) * 100
  }

  return (
    <div className={`bg-gray-700 rounded-lg p-4 border-2 ${
      winner === 'Bull' ? 'border-green-500/30' : 
      winner === 'Bear' ? 'border-red-500/30' : 
      'border-gray-600/30'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-white font-semibold">Round #{round.roundId.toString()}</span>
        </div>
        {winner && (
          <span className={`text-sm px-3 py-1 rounded-full font-bold ${
            winner === 'Bull' ? 'bg-green-500/20 text-green-400 border border-green-500' :
            winner === 'Bear' ? 'bg-red-500/20 text-red-400 border border-red-500' :
            'bg-gray-600/20 text-gray-400 border border-gray-500'
          }`}>
            {winner === 'Bull' ? '🐂 UP' : winner === 'Bear' ? '🐻 DOWN' : 'TIE'}
          </span>
        )}
      </div>
      
      {round.status >= 1 && (
        <div className="bg-black/30 rounded p-3 mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Locked:</span>
            <span className="text-white font-mono">${formatUnits(round.lockPrice || 0n, 8)}</span>
          </div>
          {round.status === 2 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Closed:</span>
                <span className="text-white font-mono">${formatUnits(round.closePrice || 0n, 8)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-white/10">
                <span className="text-gray-400">Change:</span>
                <span className={`font-bold ${priceChange > 0 ? 'text-green-400' : priceChange < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {priceChange > 0 ? '▲' : priceChange < 0 ? '▼' : ''} {Math.abs(priceChange).toFixed(2)}%
                </span>
              </div>
            </>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-green-900/20 rounded p-2">
          <span className="text-green-400 font-semibold">UP Pool</span>
          <p className="text-white font-mono">{formatEther(round.totalBullAmount || 0n)}</p>
        </div>
        <div className="bg-red-900/20 rounded p-2">
          <span className="text-red-400 font-semibold">DOWN Pool</span>
          <p className="text-white font-mono">{formatEther(round.totalBearAmount || 0n)}</p>
        </div>
      </div>
    </div>
  )
}

