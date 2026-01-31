// Update this with your deployed contract address
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000'

// This will be generated from your contract compilation
// For now, this is a placeholder - you'll need to import the actual ABI
export const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_btcOracle",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_ethOracle",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_bnbOracle",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_treasury",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "BetClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum MultiCoinPredictionMarket.Position",
        "name": "position",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "BetPlaced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "closePrice",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "enum MultiCoinPredictionMarket.Position",
        "name": "winner",
        "type": "uint8"
      }
    ],
    "name": "RoundClosed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startTimestamp",
        "type": "uint256"
      }
    ],
    "name": "RoundCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "lockPrice",
        "type": "int256"
      }
    ],
    "name": "RoundLocked",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BASIS_POINTS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CLOSE_DELAY",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ROUND_DURATION",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TREASURY_FEE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "internalType": "enum MultiCoinPredictionMarket.Position",
        "name": "position",
        "type": "uint8"
      }
    ],
    "name": "bet",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      },
      {
        "internalType": "enum MultiCoinPredictionMarket.Position",
        "name": "position",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "calculatePayout",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "checkUpkeep",
    "outputs": [
      {
        "internalType": "bool",
        "name": "upkeepNeeded",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      }
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      }
    ],
    "name": "closeRound",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      }
    ],
    "name": "createNextRound",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "",
        "type": "uint8"
      }
    ],
    "name": "currentRound",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      }
    ],
    "name": "getCurrentPrice",
    "outputs": [
      {
        "internalType": "int256",
        "name": "",
        "type": "int256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      }
    ],
    "name": "getCurrentRound",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "roundId",
            "type": "uint256"
          },
          {
            "internalType": "enum MultiCoinPredictionMarket.Coin",
            "name": "coin",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "startTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lockTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "closeTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "int256",
            "name": "lockPrice",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "closePrice",
            "type": "int256"
          },
          {
            "internalType": "uint256",
            "name": "totalBullAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalBearAmount",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "oracleCalled",
            "type": "bool"
          },
          {
            "internalType": "enum MultiCoinPredictionMarket.RoundStatus",
            "name": "status",
            "type": "uint8"
          }
        ],
        "internalType": "struct MultiCoinPredictionMarket.Round",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      }
    ],
    "name": "getRound",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "roundId",
            "type": "uint256"
          },
          {
            "internalType": "enum MultiCoinPredictionMarket.Coin",
            "name": "coin",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "startTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lockTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "closeTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "int256",
            "name": "lockPrice",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "closePrice",
            "type": "int256"
          },
          {
            "internalType": "uint256",
            "name": "totalBullAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalBearAmount",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "oracleCalled",
            "type": "bool"
          },
          {
            "internalType": "enum MultiCoinPredictionMarket.RoundStatus",
            "name": "status",
            "type": "uint8"
          }
        ],
        "internalType": "struct MultiCoinPredictionMarket.Round",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      }
    ],
    "name": "getUserBet",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "roundId",
            "type": "uint256"
          },
          {
            "internalType": "enum MultiCoinPredictionMarket.Coin",
            "name": "coin",
            "type": "uint8"
          },
          {
            "internalType": "enum MultiCoinPredictionMarket.Position",
            "name": "position",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "claimed",
            "type": "bool"
          }
        ],
        "internalType": "struct MultiCoinPredictionMarket.Bet",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "hasBet",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      }
    ],
    "name": "lockRound",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "performUpkeep",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "",
        "type": "uint8"
      }
    ],
    "name": "priceOracles",
    "outputs": [
      {
        "internalType": "contract AggregatorV3Interface",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "rounds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      },
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "startTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lockTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "closeTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "int256",
        "name": "lockPrice",
        "type": "int256"
      },
      {
        "internalType": "int256",
        "name": "closePrice",
        "type": "int256"
      },
      {
        "internalType": "uint256",
        "name": "totalBullAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalBearAmount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "oracleCalled",
        "type": "bool"
      },
      {
        "internalType": "enum MultiCoinPredictionMarket.RoundStatus",
        "name": "status",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "treasury",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userBets",
    "outputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      },
      {
        "internalType": "enum MultiCoinPredictionMarket.Coin",
        "name": "coin",
        "type": "uint8"
      },
      {
        "internalType": "enum MultiCoinPredictionMarket.Position",
        "name": "position",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "claimed",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const


