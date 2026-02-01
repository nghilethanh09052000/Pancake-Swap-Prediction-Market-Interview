'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { PredictionMarket } from '@/components/PredictionMarket'
import { CryptoPriceTicker } from '@/components/CryptoPriceTicker'
import { useState } from 'react'

type Coin = 'BTC' | 'ETH' | 'BNB'

const COIN_INFO = {
  BTC: { name: 'Bitcoin', icon: '₿', gradient: 'from-orange-500 to-yellow-500' },
  ETH: { name: 'Ethereum', icon: 'Ξ', gradient: 'from-blue-500 to-purple-500' },
  BNB: { name: 'BNB', icon: '◆', gradient: 'from-yellow-500 to-orange-500' },
}

export default function Home() {
  const [selectedCoin, setSelectedCoin] = useState<Coin>('BNB')

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Live Price Ticker */}
      <CryptoPriceTicker />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${COIN_INFO[selectedCoin].gradient} flex items-center justify-center text-2xl text-white font-bold shadow-lg`}>
              {COIN_INFO[selectedCoin].icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {COIN_INFO[selectedCoin].name} Prediction
              </h1>
              <p className="text-gray-400 text-sm">
                5-Minute Rounds • Win up to 98% of the pool
              </p>
            </div>
          </div>
          <ConnectButton />
        </header>

        {/* Coin Selector */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-2 mb-6 inline-flex gap-2 shadow-xl border border-gray-700/50">
          {(Object.keys(COIN_INFO) as Coin[]).map((coin) => (
            <button
              key={coin}
              onClick={() => setSelectedCoin(coin)}
              className={`group relative px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                selectedCoin === coin
                  ? `bg-gradient-to-br ${COIN_INFO[coin].gradient} text-white shadow-lg scale-105`
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:scale-105'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">{COIN_INFO[coin].icon}</span>
                <span>{coin}</span>
              </span>
              {selectedCoin === coin && (
                <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse"></div>
              )}
            </button>
          ))}
        </div>

        {/* Prediction Market Component */}
        <PredictionMarket coin={selectedCoin} />
      </div>
    </main>
  )
}

