'use client'

import { useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther, formatUnits } from 'viem'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/config/contract'

interface Props {
  coin: string
  coinEnum: number
  userBet: any
  round: any
  refetch: () => void
}

export function UserBets({ coin, coinEnum, userBet, round, refetch }: Props) {
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  const handleClaim = () => {
    if (!round.roundId) return

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'claim',
      args: [coinEnum, round.roundId],
    })
  }

  useEffect(() => {
    if (isConfirmed) {
      refetch()
    }
  }, [isConfirmed, refetch])

  if (!userBet || Number(userBet[3]) === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Your Bets</h3>
        <p className="text-gray-400">No active bets in this round</p>
      </div>
    )
  }

  const betAmount = userBet[3]
  const position = Number(userBet[2]) === 0 ? 'Bull' : 'Bear'
  const claimed = userBet[4]

  const canClaim = round.status === 2 && !claimed && round.oracleCalled
  const isWinner = round.status === 2 && 
    ((position === 'Bull' && round.closePrice > round.lockPrice) ||
     (position === 'Bear' && round.closePrice < round.lockPrice))

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Your Bet</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-gray-400 text-sm">Position</p>
          <p className={`text-lg font-bold ${position === 'Bull' ? 'text-bull' : 'text-bear'}`}>
            {position === 'Bull' ? '🐂 UP' : '🐻 DOWN'}
          </p>
        </div>

        <div>
          <p className="text-gray-400 text-sm">Amount</p>
          <p className="text-lg font-bold text-white">{formatEther(betAmount)} ETH</p>
        </div>

        {round.status === 2 && (
          <>
            <div>
              <p className="text-gray-400 text-sm">Result</p>
              <p className={`text-lg font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                {isWinner ? '✅ Winner!' : '❌ Lost'}
              </p>
            </div>

            {isWinner && canClaim && (
              <button
                onClick={handleClaim}
                disabled={isPending || isConfirming}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {isPending || isConfirming ? 'Claiming...' : 'Claim Winnings'}
              </button>
            )}

            {claimed && (
              <p className="text-green-400 text-sm">✅ Winnings claimed</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

