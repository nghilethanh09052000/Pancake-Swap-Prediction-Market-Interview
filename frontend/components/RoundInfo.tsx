'use client'

import { formatUnits } from 'viem'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  coin: string
  round: any
  currentPrice: bigint | undefined
  statusText: string
  timeUntilLock: number
  timeUntilClose: number
}

export function RoundInfo({ coin, round, currentPrice, statusText, timeUntilLock, timeUntilClose }: Props) {
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {coin} Prediction - Round #{Number(round.roundId)}
          </h2>
          <p className="text-gray-400">Status: <span className="text-white font-semibold">{statusText}</span></p>
        </div>
        {currentPrice && (
          <div className="text-right">
            <p className="text-gray-400 text-sm">Current Price</p>
            <p className="text-2xl font-bold text-white">
              ${formatUnits(currentPrice, 8)}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Time Until Lock</p>
          <p className="text-xl font-bold text-white">
            {timeUntilLock > 0 ? formatTime(timeUntilLock) : 'Locked'}
          </p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Time Until Close</p>
          <p className="text-xl font-bold text-white">
            {timeUntilClose > 0 ? formatTime(timeUntilClose) : 'Closed'}
          </p>
        </div>
      </div>

      {round.lockPrice > 0n && (
        <div className="mt-4 p-4 bg-blue-900/30 rounded-lg">
          <p className="text-blue-300">
            Lock Price: <span className="font-bold">${formatUnits(round.lockPrice, 8)}</span>
          </p>
        </div>
      )}
    </div>
  )
}


