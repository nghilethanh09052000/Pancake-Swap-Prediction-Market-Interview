# 🎲 Prediction Market Flow

Complete guide to how the prediction market works from a user and system perspective.

---

## 📊 System Overview

This is a **PancakeSwap-style prediction market** where users bet on cryptocurrency price movements (BTC, ETH, BNB) in 5-minute rounds.

### Key Components

1. **Smart Contract** - Manages rounds, bets, and payouts on blockchain
2. **Frontend** - Next.js UI for betting and claiming rewards
3. **Automation Script** - Manages round lifecycle (lock/close/create)
4. **Mock Oracles** - Simulates price feeds with ±$1-$3 random fluctuations

---

## 🎯 User Journey

### 1️⃣ Connect Wallet
- User connects MetaMask to `Localhost (Chain ID: 1337)`
- Wallet shows ETH balance for betting

### 2️⃣ View Live Prices
- Top banner shows real-time prices (updates every 8 seconds)
- **BTC**, **ETH**, **BNB** with price change indicators (▲ green, ▼ red)

### 3️⃣ Select Coin
- Choose from **BTC**, **ETH**, or **BNB** prediction markets
- Each coin has independent rounds running simultaneously

### 4️⃣ See Three Round States

#### **EXPIRED Round** (Left Card - Gray)
- Shows past round results
- Displays winner: 🐂 UP or 🐻 DOWN
- Shows price movement (e.g., $895 → $893)
- **Collect Button** appears ONLY for winners
- If you lost: "😢 You didn't win this round"

#### **● LIVE Round** (Middle Card - Red Border)
- Currently active, **NO BETTING ALLOWED**
- Shows "LAST PRICE" updating in real-time
- Displays "Locked Price" (price when round started)
- Shows Prize Pool total
- Users **watch and wait** for results
- When timer hits **00:00**, immediately shows results + collect button

#### **NEXT Round** (Right Card - Blue Border)
- Open for betting
- Shows Prize Pool
- Enter bet amount in ETH (e.g., 0.1, 1, 10)
- Choose: **Enter UP** (🐂) or **Enter DOWN** (🐻)
- Once bet is placed: ✅ "Bet placed!" (input disabled)
- Shows payout multipliers (0x UP / 0x DOWN)

### 5️⃣ Place a Bet

```
User Actions:
1. Enter bet amount (e.g., "1" ETH)
2. Click "Enter UP" or "Enter DOWN"
3. Confirm transaction in MetaMask
4. Wait for confirmation
5. See "✅ Bet placed!" message
```

**Smart Contract Records:**
- Your address
- Your position (Bull=UP, Bear=DOWN)
- Your bet amount
- Round ID and coin type

### 6️⃣ Wait for LIVE Round

**Timeline:**
```
00:00 - NEXT round is open for betting
        ↓
05:00 - NEXT round → LIVE round (locked)
        New NEXT round is created
        ↓
10:00 - LIVE round → EXPIRED
        Winner determined
        Collect button appears for winners
```

### 7️⃣ Claim Rewards

**When You Win:**
- EXPIRED card shows: "🐂 UP" or "🐻 DOWN" (winner)
- Button appears: `💰 Collect`
- Click to claim rewards
- Confirm transaction in MetaMask
- Receive: (Your Bet × Payout Multiplier)

**Payout Formula:**
```
Payout = (Total Prize Pool / Winning Side Pool) × Your Bet × 0.97
         (3% goes to treasury as fee)
```

**When You Lose:**
- Shows: "😢 You didn't win this round"
- No collect button
- Funds go to winners

---

## ⏱️ Round Lifecycle (5-Minute Intervals)

### Visual Timeline

```
┌─────────────────────────────────────────────────────────────┐
│  ROUND #50                                                   │
├─────────────────────────────────────────────────────────────┤
│  0:00  │ 🟦 NEXT    │ Open for betting                       │
│  1:00  │ 🟦 NEXT    │ Betting continues...                   │
│  2:00  │ 🟦 NEXT    │ Betting continues...                   │
│  3:00  │ 🟦 NEXT    │ Betting continues...                   │
│  4:00  │ 🟦 NEXT    │ Betting continues...                   │
│  5:00  │ 🔴 LIVE    │ LOCKED - No more bets                  │
│        │            │ Lock Price = $895.00                   │
│  6:00  │ 🔴 LIVE    │ Watching price...                      │
│  7:00  │ 🔴 LIVE    │ Watching price...                      │
│  8:00  │ 🔴 LIVE    │ Watching price...                      │
│  9:00  │ 🔴 LIVE    │ Watching price...                      │
│ 10:00  │ ⚫ EXPIRED │ Close Price = $893.00                  │
│        │            │ 🐻 DOWN WINS!                          │
│        │            │ [💰 Collect] (for winners)             │
└─────────────────────────────────────────────────────────────┘

At 5:00 → Round #51 is created as the new NEXT round
At 10:00 → Round #51 becomes LIVE, Round #52 is created
```

### State Transitions

```
┌──────────────────────────────────────────────────────────────┐
│                     Round Lifecycle                          │
└──────────────────────────────────────────────────────────────┘

  [CREATE]
     ↓
  Status = OPEN (0)
  🟦 NEXT Round
  Users can bet
     ↓
  After 5 minutes...
     ↓
  [LOCK] → lockRound()
     ↓
  Status = LOCKED (1)
  🔴 LIVE Round
  lockPrice = current oracle price
  No more betting
     ↓
  After 5 more minutes...
     ↓
  [CLOSE] → closeRound()
     ↓
  Status = CLOSED (2)
  ⚫ EXPIRED Round
  closePrice = current oracle price
  Determine winner:
    - closePrice > lockPrice → 🐂 BULL wins
    - closePrice < lockPrice → 🐻 BEAR wins
    - closePrice = lockPrice → 🤝 TIE (refunds)
     ↓
  [CLAIM] → claim()
     ↓
  Winners collect rewards
```

---

## 🤖 Automation Flow

The `automate-everything.js` script runs continuously to:

### 1. Update Mock Prices (Every 10 seconds)
```javascript
BTC: $98,000 ± $1-$3
ETH: $3,450 ± $1-$3
BNB: $853 ± $1-$3

Example:
📈 BTC: $98,000 → $98,002 (+$2)
📉 ETH: $3,450 → $3,448 (-$2)
➡️  BNB: $853 → $853 ($0)
```

### 2. Check Round Status (Every 10 seconds)
For each coin (BTC, ETH, BNB):

```javascript
if (round.status === OPEN && now >= lockTimestamp) {
  → lockRound(coin, roundId)
  → Set lockPrice from oracle
}

if (round.status === LOCKED && now >= closeTimestamp) {
  → closeRound(coin, roundId)
  → Set closePrice from oracle
  → Determine winner
}

if (round.status === CLOSED) {
  → Check if next round exists
  → If not: createNextRound(coin)
}
```

### 3. Console Output

```bash
[10:30:45] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Updating Prices...
────────────────────────────────────────────────────
   📈 BTC: $98,000 → $98,002 (+$2)
   📉 ETH: $3,450 → $3,448 (-$2)
   ➡️  BNB: $853 → $853 ($0)

🔄 Checking Rounds...
════════════════════════════════════════════════════

🎲 BTC Round 50:
   Status: Open
   ⏰ Round locks in 2m 15s

🎲 ETH Round 48:
   Status: Locked
   🔒 Locking ETH round 48...
   ✅ ETH Round 48 locked!

🎲 BNB Round 47:
   Status: Closed
   🆕 Creating next BNB round (Round 48)...
   ✅ BNB Round 48 created!

════════════════════════════════════════════════════
```

---

## 🎨 Frontend Flow

### Component Hierarchy

```
page.tsx
├─ CryptoPriceTicker
│  ├─ Fetches getCurrentPrice() for BTC, ETH, BNB
│  ├─ Updates every 8 seconds
│  └─ Shows price changes (▲▼)
│
└─ PredictionMarket
   ├─ Fetches currentRound(coin)
   ├─ Fetches getRound(coin, roundId-2)  → EXPIRED
   ├─ Fetches getRound(coin, roundId-1)  → LIVE
   ├─ Fetches getRound(coin, roundId)    → NEXT
   ├─ Fetches getUserBet() for each round
   ├─ Syncs time with blockchain (getCurrentBlockTimestamp)
   └─ Renders 3 cards:
      ├─ ExpiredCard → Shows results + Collect button
      ├─ LiveCard    → Shows live price + countdown
      └─ NextCard    → Betting interface
```

### Data Flow

```
1. User visits page
   ↓
2. Connect wallet (RainbowKit + Wagmi)
   ↓
3. useReadContract hooks fetch contract data:
   - currentRound(BNB) → roundId = 50
   - getRound(BNB, 48) → expired round
   - getRound(BNB, 49) → live round
   - getRound(BNB, 50) → next round
   - getCurrentBlockTimestamp() → 1769850000
   ↓
4. Parse round data (roundId, status, timestamps, prices)
   ↓
5. Calculate time remaining:
   - currentTime from blockchain
   - timeRemaining = lockTimestamp - currentTime
   ↓
6. Determine round status:
   - if status=2 → EXPIRED
   - if status=1 && timeRemaining>0 → LIVE
   - if status=1 && timeRemaining<=0 → EXPIRED (show collect)
   - if status=0 → NEXT
   ↓
7. Render cards with conditional UI
   ↓
8. User interactions:
   - Place bet → useWriteContract bet()
   - Claim reward → useWriteContract claim()
   ↓
9. Wait for transaction confirmation
   ↓
10. Re-fetch contract data (automatic via Wagmi)
```

### Time Synchronization

**Problem:** Frontend uses `Date.now()` but blockchain uses `block.timestamp`

**Solution:**
```typescript
// Fetch blockchain time
const { data: blockchainTime } = useReadContract({
  functionName: 'getCurrentBlockTimestamp'
})

// Sync every 10 seconds
useEffect(() => {
  setCurrentTime(Number(blockchainTime))
  
  // Smooth countdown: increment every second
  const interval = setInterval(() => {
    setCurrentTime(prev => prev + 1)
  }, 1000)
  
  return () => clearInterval(interval)
}, [blockchainTime]) // Re-sync every 10 seconds
```

---

## 💡 Key Features

### 1. Multi-Coin Support
- **3 independent markets**: BTC, ETH, BNB
- Each coin runs separate rounds simultaneously
- Shared prize pools per coin per round

### 2. Real-Time Updates
- **Prices update**: Every 8 seconds (frontend)
- **Mock oracle updates**: Every 10 seconds (automation)
- **Smooth countdown**: Updates every 1 second (UI)

### 3. Instant Results
- When LIVE round timer hits 00:00
- Frontend immediately shows winner
- Collect button appears for winners
- **No waiting** for automation script to close round

### 4. Winner-Only Collect
- Contract checks: `hasClaimed[coin][roundId][user]`
- Only shows button if:
  - User connected ✓
  - User bet in that round ✓
  - User bet on winning side ✓
  - User hasn't claimed yet ✓

### 5. Safety Features
- **One bet per round**: `require(!hasBet[coin][roundId][msg.sender])`
- **Cannot bet after lock**: `require(block.timestamp < lockTimestamp)`
- **Cannot claim twice**: `require(!hasClaimed[coin][roundId][msg.sender])`
- **Reentrancy protection**: `ReentrancyGuard`
- **Treasury fee**: 3% of prize pool

---

## 🚀 Quick Start Commands

```bash
# Terminal 1: Start local blockchain
npm run node

# Terminal 2: Deploy contracts + create initial rounds
npm run deploy:mocks

# Terminal 3: Run automation (price updates + round management)
npm run automate:all

# Terminal 4: Extract ABI for frontend
npm run extract-abi

# Terminal 5: Start frontend
cd frontend && npm run dev
```

**Then:**
1. Open http://localhost:3000
2. Connect MetaMask to Localhost (Chain ID: 1337)
3. Import test account: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
4. Start betting! 🎲

---

## 📝 Notes

### Why Mock Oracles?
- **Real oracles** (Chainlink) require BSC Testnet or Mainnet
- **Mock oracles** allow local development and testing
- Prices change realistically (±$1-$3 per update)

### Why 5-Minute Rounds?
- Fast enough for testing and demos
- Long enough for meaningful price changes
- Matches PancakeSwap's original design

### Why Separate Automation Script?
- Smart contracts can't self-execute on a schedule
- Automation script acts as an "oracle keeper"
- In production, use Chainlink Keepers or Gelato Network

### Future Enhancements
- [ ] Real Chainlink oracles (BSC Testnet/Mainnet)
- [ ] Historical round data and charts
- [ ] Leaderboard (top winners)
- [ ] Multiple bet positions (Close Up, Close Down)
- [ ] Longer time intervals (15m, 30m, 1h)
- [ ] Mobile-responsive design improvements

---

## 🔗 Related Files

- [Smart Contract Flow](./SMART_CONTRACT_FLOW.md) - Detailed contract logic
- [README.md](./README.md) - Setup and installation
- [contracts/MultiCoinPredictionMarket.sol](./contracts/MultiCoinPredictionMarket.sol) - Main contract
- [scripts/automate-everything.js](./scripts/automate-everything.js) - Automation script
- [frontend/src/components/PredictionMarket.tsx](./frontend/src/components/PredictionMarket.tsx) - Main UI component

---

**Last Updated:** 2026-01-31  
**Version:** 1.0.0

