'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { PredictionMarket } from '@/components/PredictionMarket'
import { CryptoPriceTicker } from '@/components/CryptoPriceTicker'
import { useState } from 'react'

type Coin = 'BTC' | 'ETH' | 'BNB'

export default function Home() {
  const [selectedCoin, setSelectedCoin] = useState<Coin>('BNB')

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Live Price Ticker - Full Width at Top */}
      <CryptoPriceTicker />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Prediction Market
            </h1>
            <p className="text-gray-400">
              Predict crypto price movements and win
            </p>
          </div>
          <ConnectButton />
        </header>

        {/* Coin Selector */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex gap-4">
            {(['BTC', 'ETH', 'BNB'] as Coin[]).map((coin) => (
              <button
                key={coin}
                onClick={() => setSelectedCoin(coin)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedCoin === coin
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {coin}
              </button>
            ))}
          </div>
        </div>

        {/* Prediction Market Component */}
        <PredictionMarket coin={selectedCoin} />
      </div>
    </main>
  )
}


