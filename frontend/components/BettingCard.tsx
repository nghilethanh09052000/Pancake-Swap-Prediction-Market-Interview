'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/config/contract'

interface Props {
  coin: string
  coinEnum: number
  roundId: bigint
  totalBull: bigint
  totalBear: bigint
  userBet: any
  refetch: () => void
}

export function BettingCard({ coin, coinEnum, roundId, totalBull, totalBear, userBet, refetch }: Props) {
  const [betAmount, setBetAmount] = useState('0.01')
  const [selectedPosition, setSelectedPosition] = useState<'bull' | 'bear' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { writeContract, data: hash, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const handleBet = async () => {
    if (!selectedPosition || !betAmount || parseFloat(betAmount) <= 0) {
      alert('Please select a position and enter a bet amount')
      return
    }

    setIsSubmitting(true)
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'bet',
        args: [coinEnum, selectedPosition === 'bull' ? 0 : 1],
        value: parseEther(betAmount),
      })
    } catch (error) {
      console.error('Bet error:', error)
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (isConfirmed) {
      refetch()
      setIsSubmitting(false)
      setBetAmount('0.01')
      setSelectedPosition(null)
    }
  }, [isConfirmed, refetch])

  const totalPool = totalBull + totalBear
  const bullOdds = totalBull > 0n ? Number(totalPool) / Number(totalBull) : 0
  const bearOdds = totalBear > 0n ? Number(totalPool) / Number(totalBear) : 0

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-2xl font-bold text-white mb-6">Place Your Bet</h3>

      {userBet && Number(userBet[3]) > 0 && (
        <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4 mb-6">
          <p className="text-blue-300">
            You already bet {formatEther(userBet[3])} ETH on{' '}
            {Number(userBet[2]) === 0 ? 'Bull' : 'Bear'}
          </p>
        </div>
      )}

      {!userBet || Number(userBet[3]) === 0 ? (
        <>
          {/* Position Selection */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setSelectedPosition('bull')}
              className={`p-6 rounded-lg border-2 transition-all ${
                selectedPosition === 'bull'
                  ? 'border-bull bg-bull/20 text-bull'
                  : 'border-gray-600 text-gray-300 hover:border-bull/50'
              }`}
            >
              <div className="text-3xl mb-2">🐂</div>
              <div className="font-bold text-xl mb-2">UP</div>
              <div className="text-sm text-gray-400">
                Pool: {formatEther(totalBull)} ETH
              </div>
              <div className="text-sm font-semibold">
                {bullOdds > 0 ? `${bullOdds.toFixed(2)}x` : 'N/A'}
              </div>
            </button>

            <button
              onClick={() => setSelectedPosition('bear')}
              className={`p-6 rounded-lg border-2 transition-all ${
                selectedPosition === 'bear'
                  ? 'border-bear bg-bear/20 text-bear'
                  : 'border-gray-600 text-gray-300 hover:border-bear/50'
              }`}
            >
              <div className="text-3xl mb-2">🐻</div>
              <div className="font-bold text-xl mb-2">DOWN</div>
              <div className="text-sm text-gray-400">
                Pool: {formatEther(totalBear)} ETH
              </div>
              <div className="text-sm font-semibold">
                {bearOdds > 0 ? `${bearOdds.toFixed(2)}x` : 'N/A'}
              </div>
            </button>
          </div>

          {/* Bet Amount */}
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Bet Amount (ETH)</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0.01"
            />
          </div>

          {/* Quick Amounts */}
          <div className="flex gap-2 mb-6">
            {['0.01', '0.1', '0.5', '1'].map((amount) => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 transition-colors"
              >
                {amount} ETH
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleBet}
            disabled={!selectedPosition || isPending || isConfirming || isSubmitting}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-colors"
          >
            {isPending || isConfirming || isSubmitting
              ? 'Processing...'
              : `Bet ${betAmount} ETH on ${selectedPosition === 'bull' ? 'UP' : 'DOWN'}`}
          </button>
        </>
      ) : null}
    </div>
  )
}

