'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useEffect, useState } from 'react'
import { formatEther, formatUnits, parseEther } from 'viem'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/config/contract'

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
  const [betAmount, setBetAmount] = useState('0.1')

  // Get current round ID
  const { data: currentRoundId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'currentRound',
    args: [coinEnum],
    query: { refetchInterval: 2000 },
  })

  // Fetch multiple rounds for horizontal scroll (like PancakeSwap)
  const roundIds = currentRoundId && currentRoundId > 2n
    ? [currentRoundId - 2n, currentRoundId - 1n, currentRoundId]
    : currentRoundId ? [currentRoundId] : []

  // Fetch round data for each visible round
  const { data: round1Data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getRound',
    args: [coinEnum, roundIds[0] || 1n],
    query: { enabled: roundIds.length > 0, refetchInterval: 3000 },
  })

  const { data: round2Data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getRound',
    args: [coinEnum, roundIds[1] || 1n],
    query: { enabled: roundIds.length > 1, refetchInterval: 2000 },
  })

  const { data: round3Data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getRound',
    args: [coinEnum, roundIds[2] || 1n],
    query: { enabled: roundIds.length > 2, refetchInterval: 2000 },
  })

  // Get current price
  const { data: currentPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCurrentPrice',
    args: [coinEnum],
    query: { refetchInterval: 5000 },
  })

  // Get blockchain time
  const { data: blockchainTime } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCurrentBlockTimestamp',
    query: { refetchInterval: 10000 },
  })

  // Smooth countdown timer
  useEffect(() => {
    if (blockchainTime) {
      setCurrentTime(Number(blockchainTime))
    }
    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [blockchainTime])

  // Betting hooks
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Claim hooks
  const { writeContract: writeClaim, data: claimHash, isPending: isClaimPending } = useWriteContract()
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash })

  const placeBet = (position: 'Bull' | 'Bear') => {
    if (!isConnected) {
      alert('Please connect your wallet first!')
      return
    }
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'bet',
      args: [coinEnum, position === 'Bull' ? 0 : 1],
      value: parseEther(betAmount),
    })
  }

  const claimReward = (roundId: bigint) => {
    if (!isConnected) {
      alert('Please connect your wallet first!')
      return
    }
    writeClaim({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'claim',
      args: [coinEnum, roundId],
    })
  }

  // Parse round data
  const parseRound = (data: any) => {
    if (!data || !data.roundId || data.roundId === 0n) return null
    return {
      roundId: data.roundId,
      startTimestamp: data.startTimestamp,
      lockTimestamp: data.lockTimestamp,
      closeTimestamp: data.closeTimestamp,
      lockPrice: data.lockPrice,
      closePrice: data.closePrice,
      totalBullAmount: data.totalBullAmount,
      totalBearAmount: data.totalBearAmount,
      status: Number(data.status),
    }
  }

  const rounds = [parseRound(round1Data), parseRound(round2Data), parseRound(round3Data)].filter(r => r !== null)

  // Fetch user bets for all rounds (for claiming and checking if already bet)
  const { data: userBet1 } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserBet',
    args: [coinEnum, address || '0x0000000000000000000000000000000000000000', rounds[0]?.roundId || 1n],
    query: { enabled: isConnected && rounds.length > 0 },
  })

  const { data: userBet2 } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserBet',
    args: [coinEnum, address || '0x0000000000000000000000000000000000000000', rounds[1]?.roundId || 1n],
    query: { enabled: isConnected && rounds.length > 1 },
  })

  const { data: userBet3 } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserBet',
    args: [coinEnum, address || '0x0000000000000000000000000000000000000000', rounds[2]?.roundId || 1n],
    query: { enabled: isConnected && rounds.length > 2 },
  })

  const userBets = [userBet1, userBet2, userBet3]

  // Check if user has already bet in a round
  const hasUserBet = (userBet: any) => {
    if (!userBet) return false
    return userBet.user && userBet.user !== '0x0000000000000000000000000000000000000000' && userBet.amount > 0n
  }

  // Determine round status (SIMPLE LOGIC)
  const getRoundStatus = (round: any) => {
    if (!round || !currentRoundId) return 'expired'
    
    // NEXT = Current round (always open for betting)
    if (round.roundId === currentRoundId) return 'next'
    
    // LIVE = Previous round (if it's locked, status=1)
    if (round.roundId === currentRoundId - 1n && round.status === 1) return 'live'
    
    // Everything else = EXPIRED
    return 'expired'
  }

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const formatPrice = (price: bigint) => {
    return `$${parseFloat(formatUnits(price, 8)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const calculatePayout = (round: any, position: 'Bull' | 'Bear') => {
    if (!round || round.totalBullAmount === 0n || round.totalBearAmount === 0n) return '0.00'
    const totalPool = round.totalBullAmount + round.totalBearAmount
    const winningPool = position === 'Bull' ? round.totalBullAmount : round.totalBearAmount
    if (winningPool === 0n) return '0.00'
    const payout = (Number(formatEther(totalPool)) / Number(formatEther(winningPool))) * 0.97
    return payout.toFixed(2)
  }

  // Check if user won a round
  const checkUserWon = (round: any, userBet: any) => {
    if (!round || !userBet || !round.lockPrice || !round.closePrice) return false
    if (!userBet.user || userBet.user === '0x0000000000000000000000000000000000000000') return false
    
    // Determine winner: 0=Bull, 1=Bear
    let winner: number
    if (round.closePrice > round.lockPrice) {
      winner = 0 // Bull wins
    } else if (round.closePrice < round.lockPrice) {
      winner = 1 // Bear wins
    } else {
      return true // Tie - everyone can claim refund
    }
    
    const userPosition = Number(userBet.position)
    return userPosition === winner
  }

  if (!currentRoundId || rounds.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400">Loading round data...</p>
      </div>
    )
  }

  // Get the current round to calculate global timer
  const currentRound = rounds.find(r => r && r.roundId === currentRoundId)
  const globalTimeRemaining = currentRound 
    ? Number(currentRound.lockTimestamp) - currentTime 
    : 0

  return (
    <div className="space-y-6">
      {/* Global Timer - Top Right */}
      <div className="flex justify-end">
        <div className="bg-purple-600 text-white px-6 py-3 rounded-full font-bold text-xl flex items-center gap-2">
          ⏱️ {formatTime(Math.max(0, globalTimeRemaining))} 
          <span className="text-sm opacity-75">5m</span>
        </div>
      </div>

      {/* Horizontal Scrolling Cards (PancakeSwap Style) */}
          <div className="relative">
        <div className="flex gap-6 overflow-x-auto pb-6 px-2 snap-x snap-mandatory">
          {rounds.map((round: any, index: number) => {
            const status = getRoundStatus(round)
            const isLive = status === 'live'
            const isNext = status === 'next'
            const isExpired = status === 'expired'
            
            const timeRemaining = isLive 
              ? Number(round.closeTimestamp) - currentTime
              : isNext
              ? Number(round.lockTimestamp) - currentTime
              : 0
            
            const progress = isLive || isNext
              ? Math.min(Math.max((timeRemaining / 300) * 100, 0), 100)
              : 0

            // LIVE round finished = treat as expired for display
            const liveFinished = isLive && timeRemaining <= 0
            const showAsExpired = isExpired || liveFinished

            // Check if user won this round (for expired/finished rounds)
            const userBet = userBets[index]
            const userWon = showAsExpired && checkUserWon(round, userBet)
            
            // Check if user has already bet in this round (for NEXT rounds)
            const hasAlreadyBet = hasUserBet(userBet)

            return (
              <div key={round.roundId.toString()} className="flex-shrink-0 w-[420px] snap-center">
                <div className="relative">
                  {/* Status Badge */}
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    {showAsExpired && (
                      <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-2 rounded-full shadow-lg">
                        <span className="text-white font-bold text-sm">EXPIRED</span>
                </div>
                    )}
                    {isLive && !liveFinished && (
                      <div className="bg-gradient-to-r from-red-500 to-pink-500 px-6 py-2 rounded-full shadow-lg flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span className="text-white font-bold text-sm">● LIVE</span>
              </div>
                    )}
                    {isNext && (
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2 rounded-full shadow-lg">
                        <span className="text-white font-bold text-sm">NEXT</span>
            </div>
          )}
      </div>

                  {/* Card */}
                  <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border-2 shadow-2xl mt-2 ${
                    isLive && !liveFinished ? 'border-red-500/30' : 
                    isNext ? 'border-blue-500/30' : 
                    'border-gray-700/30'
                  }`}>
                    {/* Round Number - NO TIMER */}
                    <div className="text-center mb-4 mt-2">
                      <div className="text-gray-400 text-sm">#{round.roundId.toString()}</div>
            </div>

                    {/* EXPIRED ROUND */}
                    {isExpired && round.lockPrice && round.closePrice && (
                      <div className="space-y-3">
                        <div className={`rounded-xl p-4 text-center ${
                          round.closePrice > round.lockPrice
                            ? 'bg-green-500/20 border border-green-500/50'
                            : round.closePrice < round.lockPrice
                            ? 'bg-red-500/20 border border-red-500/50'
                            : 'bg-gray-500/20 border border-gray-500/50'
                        }`}>
                          <div className="text-2xl font-bold mb-1">
                            {round.closePrice > round.lockPrice && '🐂 UP'}
                            {round.closePrice < round.lockPrice && '🐻 DOWN'}
                            {round.closePrice === round.lockPrice && '🤝 TIE'}
                          </div>
                          <div className="text-sm text-gray-300">
                            {formatPrice(round.lockPrice)} → {formatPrice(round.closePrice)}
                  </div>
                </div>
                
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <div className="text-gray-400 text-xs mb-1">Prize Pool</div>
                          <div className="text-white font-bold">
                            {formatEther(round.totalBullAmount + round.totalBearAmount)} ETH
              </div>
            </div>

                        {/* Collect Button - ONLY for winners */}
                        {isConnected && userWon ? (
                          <button
                            onClick={() => claimReward(round.roundId)}
                            disabled={isClaimPending || isClaimConfirming}
                            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 rounded-lg transition-all disabled:cursor-not-allowed"
                          >
                            {isClaimPending || isClaimConfirming ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">⏳</span>
                                {isClaimPending ? 'Confirm...' : 'Claiming...'}
                              </span>
                            ) : isClaimSuccess ? (
                              '✅ Claimed!'
                            ) : (
                              '💰 Collect'
                            )}
                          </button>
                        ) : !isConnected ? (
                          <div className="text-center text-gray-500 text-sm py-3">
                            Connect wallet to collect
              </div>
                        ) : userBet && userBet.user && userBet.user !== '0x0000000000000000000000000000000000000000' ? (
                          <div className="text-center text-red-400 text-sm py-3 bg-red-500/10 rounded-lg">
                            😢 You didn't win this round
                </div>
                        ) : null}
                </div>
                    )}

                    {/* LIVE ROUND */}
                    {isLive && !liveFinished && (
                      <div className="space-y-3">
                        {/* Last Price Label */}
                        <div className="text-center mb-3">
                          <div className="text-gray-400 text-xs mb-2">LAST PRICE</div>
                          <div className="text-white font-bold text-3xl">{currentPrice ? formatPrice(currentPrice) : '...'}</div>
                          {currentPrice && round.lockPrice && currentPrice !== round.lockPrice && (
                            <div className={`text-sm mt-1 font-bold ${
                              currentPrice > round.lockPrice ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {currentPrice > round.lockPrice ? '▲' : '▼'} 
                              {currentPrice > round.lockPrice ? '$' : '$-'}
                              {Math.abs(Number(formatUnits(currentPrice - round.lockPrice, 8))).toFixed(2)}
              </div>
                          )}
            </div>

                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <div className="text-gray-400 text-xs mb-1">Locked Price</div>
                          <div className="text-white font-bold text-lg">{formatPrice(round.lockPrice)}</div>
                </div>

                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <div className="text-gray-400 text-xs mb-1">Prize Pool</div>
                          <div className="text-white font-bold text-lg">
                            {formatEther(round.totalBullAmount + round.totalBearAmount)} ETH
              </div>
            </div>

                        {/* UP/DOWN indicators */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-green-500/10 rounded-lg p-3 text-center">
                            <div className="text-green-400 font-bold text-sm mb-1">0x Payout</div>
                            <div className="text-green-400 text-2xl font-bold">UP</div>
            </div>
                          <div className="bg-red-500/10 rounded-lg p-3 text-center">
                            <div className="text-red-400 font-bold text-sm mb-1">0x Payout</div>
                            <div className="text-red-400 text-2xl font-bold">DOWN</div>
              </div>
            </div>
          </div>
        )}

                    {/* LIVE ROUND FINISHED - Show as EXPIRED with collect button */}
                    {liveFinished && currentPrice && round.lockPrice && (
                      <div className="space-y-3">
                        <div className={`rounded-xl p-4 text-center ${
                          currentPrice > round.lockPrice
                            ? 'bg-green-500/20 border border-green-500/50'
                            : currentPrice < round.lockPrice
                            ? 'bg-red-500/20 border border-red-500/50'
                            : 'bg-gray-500/20 border border-gray-500/50'
                        }`}>
                          <div className="text-2xl font-bold mb-1">
                            {currentPrice > round.lockPrice && '🐂 UP'}
                            {currentPrice < round.lockPrice && '🐻 DOWN'}
                            {currentPrice === round.lockPrice && '🤝 TIE'}
                          </div>
                          <div className="text-sm text-gray-300">
                            {formatPrice(round.lockPrice)} → {formatPrice(currentPrice)}
                          </div>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <div className="text-gray-400 text-xs mb-1">Prize Pool</div>
                          <div className="text-white font-bold">
                            {formatEther(round.totalBullAmount + round.totalBearAmount)} ETH
                          </div>
                        </div>

                        {/* Collect Button - ONLY for winners */}
                        {isConnected && userWon ? (
                          <button
                            onClick={() => claimReward(round.roundId)}
                            disabled={isClaimPending || isClaimConfirming}
                            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 rounded-lg transition-all disabled:cursor-not-allowed"
                          >
                            {isClaimPending || isClaimConfirming ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">⏳</span>
                                {isClaimPending ? 'Confirm...' : 'Claiming...'}
                              </span>
                            ) : isClaimSuccess ? (
                              '✅ Claimed!'
                            ) : (
                              '💰 Collect'
                            )}
                          </button>
                        ) : !isConnected ? (
                          <div className="text-center text-gray-500 text-sm py-3">
                            Connect wallet to collect
                          </div>
                        ) : userBet && userBet.user && userBet.user !== '0x0000000000000000000000000000000000000000' ? (
                          <div className="text-center text-red-400 text-sm py-3 bg-red-500/10 rounded-lg">
                            😢 You didn't win this round
                          </div>
                        ) : null}
            </div>
                    )}

                    {/* NEXT ROUND */}
                    {isNext && (
                      <div className="space-y-3">
                        {/* Prize Pool Header */}
                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <div className="text-gray-400 text-xs mb-1">Prize Pool:</div>
                          <div className="text-white font-bold text-lg">&lt;0.0001 ETH</div>
          </div>

                        {/* Show user's bet if already placed */}
                        {hasAlreadyBet && userBet && (
                          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
                            <div className="text-center text-blue-400 font-bold text-sm mb-2">
                              ✅ Your Bet Placed
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-gray-400">Amount:</div>
                              <div className="text-white font-bold">{formatEther(userBet.amount)} ETH</div>
                              <div className="text-gray-400">Position:</div>
                              <div className={`font-bold ${Number(userBet.position) === 0 ? 'text-green-400' : 'text-pink-400'}`}>
                                {Number(userBet.position) === 0 ? '🐂 UP' : '🐻 DOWN'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Bet Amount Input - Disabled if already bet */}
                        <div>
                          <label className="text-gray-400 text-xs mb-2 block">Bet Amount (ETH)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={betAmount}
                            onChange={(e) => setBetAmount(e.target.value)}
                            disabled={isPending || isConfirming || isSuccess || hasAlreadyBet}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-lg focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="0.1"
                          />
              </div>
              
                        {/* Bet Buttons - Disabled if already bet */}
                        <div className="space-y-2">
                          <button
                            onClick={() => placeBet('Bull')}
                            disabled={isPending || isConfirming || isSuccess || !isConnected || hasAlreadyBet}
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-4 rounded-xl transition-all disabled:cursor-not-allowed"
                          >
                            <div className="text-sm">{hasAlreadyBet ? '🔒 Bet Locked' : 'Enter UP'}</div>
                          </button>
                          <button
                            onClick={() => placeBet('Bear')}
                            disabled={isPending || isConfirming || isSuccess || !isConnected || hasAlreadyBet}
                            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-4 rounded-xl transition-all disabled:cursor-not-allowed"
                          >
                            <div className="text-sm">{hasAlreadyBet ? '🔒 Bet Locked' : 'Enter DOWN'}</div>
                          </button>
            </div>
            
                        {isSuccess && !hasAlreadyBet && (
                          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-2 text-center text-green-400 text-sm font-bold">
                            ✅ Bet placed!
                          </div>
                        )}

                        {/* UP/DOWN pools */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-green-500/10 rounded-lg p-3 text-center">
                            <div className="text-green-400 font-bold text-sm mb-1">0x Payout</div>
                            <div className="text-green-400 text-2xl font-bold">UP</div>
            </div>
                          <div className="bg-pink-500/10 rounded-lg p-3 text-center">
                            <div className="text-pink-400 font-bold text-sm mb-1">0x Payout</div>
                            <div className="text-pink-400 text-2xl font-bold">DOWN</div>
            </div>
          </div>
          </div>
                    )}
                </div>
                </div>
              </div>
            )
          })}
            </div>

        <div className="text-center text-gray-500 text-sm mt-2">
          ← Scroll to view all rounds →
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
        <h3 className="text-white font-bold mb-4">📖 How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-blue-400 font-bold mb-2">1️⃣ NEXT Round (5 min)</div>
            <div className="text-gray-400">Place your bet - Will price go UP or DOWN?</div>
          </div>
          <div>
            <div className="text-red-400 font-bold mb-2">2️⃣ LIVE Round (5 min)</div>
            <div className="text-gray-400">Watch in real-time - Price locked, waiting for results</div>
          </div>
          <div>
            <div className="text-green-400 font-bold mb-2">3️⃣ Results</div>
            <div className="text-gray-400">Winners split the pool - Up to 98% returns!</div>
        </div>
        </div>
      </div>
    </div>
  )
}

