'use client'

import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/config/contract'
import { useEffect, useState } from 'react'

const COINS = [
  { name: 'BTC', symbol: 'Bitcoin', enum: 0, icon: '₿', color: 'text-orange-400' },
  { name: 'ETH', symbol: 'Ethereum', enum: 1, icon: 'Ξ', color: 'text-blue-400' },
  { name: 'BNB', symbol: 'BNB', enum: 2, icon: '◆', color: 'text-yellow-400' },
]

export function CryptoPriceTicker() {
  const [previousPrices, setPreviousPrices] = useState<{ [key: number]: bigint }>({})
  const [priceChanges, setPriceChanges] = useState<{ [key: number]: 'up' | 'down' | 'same' }>({})

  return (
    <div className="bg-gray-900/95 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50 shadow-2xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute inset-0 text-green-400 text-lg animate-ping opacity-75">●</span>
              <span className="relative text-green-400 text-lg">●</span>
            </div>
            <div>
              <span className="text-white font-bold text-sm tracking-wide">LIVE PRICES</span>
              <div className="text-gray-500 text-xs">Updates every 8 seconds</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {COINS.map((coin) => (
              <CoinPrice
                key={coin.enum}
                coin={coin}
                previousPrices={previousPrices}
                setPreviousPrices={setPreviousPrices}
                priceChanges={priceChanges}
                setPriceChanges={setPriceChanges}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface CoinPriceProps {
  coin: typeof COINS[0]
  previousPrices: { [key: number]: bigint }
  setPreviousPrices: React.Dispatch<React.SetStateAction<{ [key: number]: bigint }>>
  priceChanges: { [key: number]: 'up' | 'down' | 'same' }
  setPriceChanges: React.Dispatch<React.SetStateAction<{ [key: number]: 'up' | 'down' | 'same' }>>
}

function CoinPrice({ coin, previousPrices, setPreviousPrices, priceChanges, setPriceChanges }: CoinPriceProps) {
  const { data: currentPrice, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCurrentPrice',
    args: [coin.enum],
    query: {
      refetchInterval: 8000, // 8 seconds
    },
  })

  useEffect(() => {
    // Update every 8 seconds
    const interval = setInterval(() => {
      refetch()
    }, 8000)

    return () => clearInterval(interval)
  }, [refetch])

  useEffect(() => {
    if (currentPrice && previousPrices[coin.enum]) {
      if (currentPrice > previousPrices[coin.enum]) {
        setPriceChanges(prev => ({ ...prev, [coin.enum]: 'up' }))
      } else if (currentPrice < previousPrices[coin.enum]) {
        setPriceChanges(prev => ({ ...prev, [coin.enum]: 'down' }))
      } else {
        setPriceChanges(prev => ({ ...prev, [coin.enum]: 'same' }))
      }
    }
    
    if (currentPrice) {
      setPreviousPrices(prev => ({ ...prev, [coin.enum]: currentPrice }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice, coin.enum])

  const priceChangeClass = 
    priceChanges[coin.enum] === 'up' ? 'bg-green-500/20 border-green-500' :
    priceChanges[coin.enum] === 'down' ? 'bg-red-500/20 border-red-500' :
    'bg-gray-700/20 border-gray-600'

  const priceChangeIcon = 
    priceChanges[coin.enum] === 'up' ? '▲' :
    priceChanges[coin.enum] === 'down' ? '▼' :
    '●'

  const priceChangeColor = 
    priceChanges[coin.enum] === 'up' ? 'text-green-400' :
    priceChanges[coin.enum] === 'down' ? 'text-red-400' :
    'text-gray-400'

  const priceValue = currentPrice ? formatUnits(currentPrice, 8) : '--'
  const formattedPrice = priceValue !== '--' ? parseFloat(priceValue).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) : '--'

  return (
    <div className={`group relative flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all duration-500 ${priceChangeClass} hover:scale-105 hover:shadow-2xl`}>
      <div className="flex items-center gap-3">
        <div className={`text-3xl font-bold ${coin.color} drop-shadow-lg`}>{coin.icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-base">{coin.name}</span>
            <span className={`text-sm font-bold ${priceChangeColor} transition-all duration-300 ${
              priceChanges[coin.enum] !== 'same' ? 'scale-125 animate-bounce' : ''
            }`}>
              {priceChangeIcon}
            </span>
          </div>
          <span className="text-gray-400 text-xs font-medium">{coin.symbol}</span>
        </div>
      </div>
      
      <div className="text-right ml-4">
        <div className="text-white font-bold text-xl font-mono tracking-tight">
          ${formattedPrice}
        </div>
        <div className="text-xs text-gray-500 font-medium">USD</div>
      </div>

      {/* Animated background glow */}
      {priceChanges[coin.enum] !== 'same' && (
        <div className={`absolute inset-0 rounded-xl opacity-50 blur-xl ${
          priceChanges[coin.enum] === 'up' ? 'bg-green-500/30' : 'bg-red-500/30'
        } animate-pulse`}></div>
      )}
    </div>
  )
}

