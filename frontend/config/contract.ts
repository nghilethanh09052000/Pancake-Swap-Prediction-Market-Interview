// Update this with your deployed contract address
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000'

// This will be generated from your contract compilation
// For now, this is a placeholder - you'll need to import the actual ABI
export const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: 'uint8', name: 'coin', type: 'uint8' },
      { internalType: 'uint8', name: 'position', type: 'uint8' }
    ],
    name: 'bet',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint8', name: 'coin', type: 'uint8' },
      { internalType: 'uint256', name: 'roundId', type: 'uint256' }
    ],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint8', name: 'coin', type: 'uint8' }],
    name: 'currentRound',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint8', name: 'coin', type: 'uint8' }],
    name: 'getCurrentRound',
    outputs: [
      { internalType: 'uint256', name: 'roundId', type: 'uint256' },
      { internalType: 'uint8', name: 'coin', type: 'uint8' },
      { internalType: 'uint256', name: 'startTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'lockTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'closeTimestamp', type: 'uint256' },
      { internalType: 'int256', name: 'lockPrice', type: 'int256' },
      { internalType: 'int256', name: 'closePrice', type: 'int256' },
      { internalType: 'uint256', name: 'totalBullAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'totalBearAmount', type: 'uint256' },
      { internalType: 'bool', name: 'oracleCalled', type: 'bool' },
      { internalType: 'uint8', name: 'status', type: 'uint8' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint8', name: 'coin', type: 'uint8' },
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'roundId', type: 'uint256' }
    ],
    name: 'getUserBet',
    outputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'roundId', type: 'uint256' },
      { internalType: 'uint8', name: 'coin', type: 'uint8' },
      { internalType: 'uint8', name: 'position', type: 'uint8' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'bool', name: 'claimed', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint8', name: 'coin', type: 'uint8' }],
    name: 'getCurrentPrice',
    outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const


