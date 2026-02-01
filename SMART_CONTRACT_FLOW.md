# 📜 Smart Contract Flow

Complete guide to **runtime interactions** with the `MultiCoinPredictionMarket.sol` smart contract - what gets touched, what changes, edge cases, and failure scenarios.

---

## 🎯 Quick Reference: What Happens When...

| User Action | State Changes | Events Emitted | Can Fail? |
|-------------|---------------|----------------|-----------|
| Deploy contract | Initialize 3 rounds (BTC/ETH/BNB) | `RoundCreated` × 3 | ❌ No |
| Place bet | `bets[coin][round][user]`, `totalBullAmount` or `totalBearAmount`, `hasBet[coin][round][user]` | `BetPlaced` | ✅ Yes (9 reasons) |
| Lock round | `round.status`, `round.lockPrice` | `RoundLocked` | ✅ Yes (4 reasons) |
| Close round | `round.status`, `round.closePrice`, `round.oracleCalled` | `RoundClosed` | ✅ Yes (5 reasons) |
| Claim reward | `hasClaimed[coin][round][user]`, `user's ETH balance` | `RewardClaimed` | ✅ Yes (6 reasons) |
| Create next round | `currentRound[coin]`, `rounds[coin][newId]` | `RoundCreated` | ✅ Yes (2 reasons) |

---

## 🏗️ Contract Architecture

### Contract Name
`MultiCoinPredictionMarket`

### Inheritance
- `Ownable` - Access control for admin functions
- `ReentrancyGuard` - Protection against reentrancy attacks

### Dependencies
- `@chainlink/contracts/AggregatorV3Interface` - Price oracle interface
- OpenZeppelin contracts for security

---

## 📊 Data Structures

### Enums

#### 1. Coin
```solidity
enum Coin {
    BTC,  // 0
    ETH,  // 1
    BNB   // 2
}
```

#### 2. Position
```solidity
enum Position {
    Bull,  // 0 - Bet price goes UP
    Bear   // 1 - Bet price goes DOWN
}
```

#### 3. RoundStatus
```solidity
enum RoundStatus {
    Open,    // 0 - Accepting bets
    Locked,  // 1 - Betting closed, waiting for result
    Closed   // 2 - Result determined, payouts available
}
```

### Structs

#### Round
```solidity
struct Round {
    uint256 roundId;            // Unique round identifier
    Coin coin;                  // BTC, ETH, or BNB
    uint256 startTimestamp;     // When round was created
    uint256 lockTimestamp;      // When betting closes (startTimestamp + 5 min)
    uint256 closeTimestamp;     // When round ends (lockTimestamp + 5 min)
    int256 lockPrice;           // Price when locked (from oracle)
    int256 closePrice;          // Price when closed (from oracle)
    uint256 totalBullAmount;    // Total ETH bet on UP
    uint256 totalBearAmount;    // Total ETH bet on DOWN
    bool oracleCalled;          // Whether round has been closed
    RoundStatus status;         // Open, Locked, or Closed
}
```

#### Bet
```solidity
struct Bet {
    address user;          // Bettor's address
    uint256 amount;        // Bet amount in wei
    Position position;     // Bull or Bear
    bool claimed;          // Whether user has claimed reward
}
```

---

## 🗄️ State Variables

### Oracles
```solidity
AggregatorV3Interface public btcOracle;  // BTC/USD price feed
AggregatorV3Interface public ethOracle;  // ETH/USD price feed
AggregatorV3Interface public bnbOracle;  // BNB/USD price feed
```

### Treasury
```solidity
address public treasury;  // Receives 3% fee from each round
```

### Round Management
```solidity
// Current round ID for each coin
mapping(Coin => uint256) public currentRound;

// Round data: rounds[coin][roundId] => Round
mapping(Coin => mapping(uint256 => Round)) public rounds;

// User bets: bets[coin][roundId][user] => Bet
mapping(Coin => mapping(uint256 => mapping(address => Bet))) public bets;

// Bet tracking: hasBet[coin][roundId][user] => bool
mapping(Coin => mapping(uint256 => mapping(address => bool))) public hasBet;

// Claim tracking: hasClaimed[coin][roundId][user] => bool
mapping(Coin => mapping(uint256 => mapping(address => bool))) public hasClaimed;
```

### Constants
```solidity
uint256 public constant ROUND_DURATION = 5 minutes;    // Time for betting
uint256 public constant LOCK_DURATION = 5 minutes;     // Time for live round
uint256 public constant TREASURY_FEE = 3;              // 3% fee
uint256 public constant MIN_BET_AMOUNT = 0.01 ether;   // Minimum bet
```

---

## 🔄 Interaction Flow #1: Placing a Bet

### User Clicks "Enter UP" with 1 ETH

#### Step 1: Frontend Preparation
```typescript
// Frontend builds transaction
const tx = await writeContract({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: 'bet',
  args: [Coin.BTC, Position.Bull], // BTC, UP
  value: parseEther("1") // 1 ETH
})
```

#### Step 2: Transaction Sent to Blockchain
- User signs in MetaMask
- Gas estimated: ~100,000 gas (~$3-5 on mainnet)
- Transaction enters mempool

#### Step 3: Contract Execution Begins
```solidity
function bet(Coin coin, Position position) external payable nonReentrant
```

**State Reads (What contract checks):**
1. ✅ `currentRound[BTC]` → Get roundId (e.g., 50)
2. ✅ `rounds[BTC][50]` → Load full round data
3. ✅ `hasBet[BTC][50][msg.sender]` → Check if already bet

**Validation Checks (Can fail here!):**
```solidity
// ❌ FAIL CASE #1: Round doesn't exist
require(round.roundId != 0, "Round not started")

// ❌ FAIL CASE #2: Round already locked
require(round.status == RoundStatus.Open, "Round not open")

// ❌ FAIL CASE #3: Too late to bet
require(block.timestamp < round.lockTimestamp, "Round is locked")

// ❌ FAIL CASE #4: Bet too small
require(msg.value >= MIN_BET_AMOUNT, "Bet too small")

// ❌ FAIL CASE #5: Already bet
require(!hasBet[coin][roundId][msg.sender], "Already bet in this round")
```

#### Step 4: State Writes (What changes)

**Write #1: Create bet record**
```solidity
// Before: bets[BTC][50][0x123...] = undefined
bets[coin][roundId][msg.sender] = Bet({
    user: msg.sender,           // 0x123...
    amount: msg.value,          // 1000000000000000000 (1 ETH in wei)
    position: position,         // 0 (Bull)
    claimed: false              // false
})
// After: bets[BTC][50][0x123...] = { user: 0x123, amount: 1e18, position: 0, claimed: false }
```

**Write #2: Update round totals**
```solidity
// Before: round.totalBullAmount = 5 ETH
if (position == Position.Bull) {
    rounds[coin][roundId].totalBullAmount += msg.value
    // After: round.totalBullAmount = 6 ETH
    } else {
    rounds[coin][roundId].totalBearAmount += msg.value
}
```

**Write #3: Mark user as having bet**
```solidity
// Before: hasBet[BTC][50][0x123...] = false
hasBet[coin][roundId][msg.sender] = true
// After: hasBet[BTC][50][0x123...] = true
```

#### Step 5: Event Emission
```solidity
emit BetPlaced(
    msg.sender,    // 0x123...
    coin,          // BTC (0)
    roundId,       // 50
    position,      // Bull (0)
    msg.value      // 1000000000000000000
)
```

**Frontend receives event:**
- Wagmi auto-refetches contract data
- UI updates to show "✅ Bet placed!"
- Prize pool increases from 5 ETH → 6 ETH

#### Step 6: Final State
```
✅ User's 1 ETH transferred to contract
✅ Contract balance increased by 1 ETH
✅ Round's totalBullAmount increased by 1 ETH
✅ User marked as having bet
✅ Cannot bet again in this round
```

---

## 🔄 Interaction Flow #2: Locking a Round

### Automation Script Calls `lockRound()`

#### Trigger Condition
```javascript
// Automation checks:
if (round.status === 0 && now >= round.lockTimestamp) {
    await market.lockRound(Coin.BTC, 50)
}
```

#### Step 1: Transaction Sent
```javascript
const tx = await market.lockRound(Coin.BTC, 50)
// Sent by: Automation wallet (owner)
// Gas: ~80,000
```

#### Step 2: Access Control Check
```solidity
function lockRound(Coin coin, uint256 roundId) external onlyOwner
```

**State Read:**
1. ✅ `owner()` → Check if caller is owner

**Validation:**
```solidity
// ❌ FAIL CASE #1: Not owner
require(msg.sender == owner(), "Ownable: caller is not the owner")
```

#### Step 3: Load Round Data
```solidity
Round storage round = rounds[coin][roundId];
```

**State Read:**
2. ✅ `rounds[BTC][50]` → Load full round from storage

#### Step 4: Validation Checks
```solidity
// ❌ FAIL CASE #2: Round doesn't exist
require(round.roundId != 0, "Round not found")

// ❌ FAIL CASE #3: Round not open
require(round.status == RoundStatus.Open, "Round already locked")

// ❌ FAIL CASE #4: Too early to lock
require(block.timestamp >= round.lockTimestamp, "Too early to lock")
```

#### Step 5: Fetch Oracle Price
```solidity
(, int256 price, , uint256 timestamp, ) = _getLatestPrice(coin)
```

**External Call Happens:**
```
Contract → Oracle Contract
  ↓
Oracle.latestRoundData()
  ↓
Returns: (roundId: 12345, price: 9800000000000, timestamp: 1769850000, ...)
```

**State Read (from oracle contract):**
3. ✅ Oracle's `latestRoundData()` → Read external state

**⚠️ Can fail if:**
- Oracle contract is down (unlikely with Chainlink)
- RPC node issue (network error)
- Price data stale (unlikely locally)

#### Step 6: State Writes
```solidity
// Before: round.lockPrice = 0, round.status = 0 (Open)

round.lockPrice = price           // 9800000000000 ($98,000)
round.status = RoundStatus.Locked // 1

// After: round.lockPrice = 9800000000000, round.status = 1 (Locked)
```

**What changed in storage:**
```
rounds[BTC][50].lockPrice:  0 → 98000_00000000
rounds[BTC][50].status:     0 → 1
```

#### Step 7: Event Emission
```solidity
emit RoundLocked(
    coin,       // BTC (0)
    roundId,    // 50
    price,      // 98000_00000000
    timestamp   // 1769850000
)
```

#### Step 8: Final State
```
✅ Betting closed for Round #50
✅ Lock price recorded: $98,000
✅ Status changed: Open → Locked
✅ Users can no longer bet
✅ Frontend shows "● LIVE" badge
```

---

## 🔄 Interaction Flow #3: Closing a Round

### Automation Script Calls `closeRound()`

#### Step 1-4: Similar to Lock (owner check, load round, validate)

#### Step 5: Fetch Final Oracle Price
```solidity
(, int256 price, , uint256 timestamp, ) = _getLatestPrice(coin)
// Returns: 98100_00000000 ($98,100)
```

#### Step 6: Determine Winner
```solidity
    Position winner;

    if (closePrice > lockPrice) {
    // 98100 > 98000 ✅
    winner = Position.Bull  // UP wins!
    } else if (closePrice < lockPrice) {
    winner = Position.Bear  // DOWN wins
    } else {
    winner = Position.Tie   // Refund
}
```

**State Changes:**
```
rounds[BTC][50].closePrice:   0 → 98100_00000000
rounds[BTC][50].status:       1 → 2 (Closed)
rounds[BTC][50].oracleCalled: false → true
```

#### Step 7: Event Emission
```solidity
emit RoundClosed(
    coin,       // BTC (0)
    roundId,    // 50
    price,      // 98100_00000000
    winner,     // Position.Bull (0)
    timestamp   // 1769850300
)
```

#### Step 8: Frontend Updates
- Event triggers Wagmi refetch
- Round status changes: LIVE → EXPIRED
- UI shows: "🐂 UP - $98,000 → $98,100"
- Collect button appears for Bull bettors

---

## 🔄 Interaction Flow #4: Claiming Rewards

### User Clicks "💰 Collect"

#### Step 1: Transaction Sent
```typescript
const tx = await writeContract({
  functionName: 'claim',
  args: [Coin.BTC, 50n]
})
```

#### Step 2: Reentrancy Guard Activated
```solidity
function claim(Coin coin, uint256 roundId) external nonReentrant
```

**State Write:**
```
_status = _ENTERED  // Prevents recursive calls
```

#### Step 3: Load User's Bet
```solidity
Bet storage bet = bets[coin][roundId][msg.sender];
```

**State Reads:**
1. ✅ `bets[BTC][50][0x123...]` → Load bet data
2. ✅ `rounds[BTC][50]` → Load round data

#### Step 4: Validation Checks
```solidity
// ❌ FAIL CASE #1: Didn't bet
require(bet.user != address(0), "No bet placed")

// ❌ FAIL CASE #2: Round not closed
require(round.status == RoundStatus.Closed, "Round not closed")

// ❌ FAIL CASE #3: Oracle not called
require(round.oracleCalled, "Round not finalized")

// ❌ FAIL CASE #4: Already claimed
require(!hasClaimed[coin][roundId][msg.sender], "Already claimed")
```

#### Step 5: Check if Winner
```solidity
Position winner = _determineWinner(round)
// winner = Position.Bull (0)

// User bet on Bull (0), winner is Bull (0) ✅
require(bet.position == winner, "Not a winner")
```

**❌ FAIL CASE #5: User bet on losing side**
```solidity
// User bet Bear (1), but Bull (0) won
// → Transaction reverts: "Not a winner"
```

#### Step 6: Calculate Reward
```solidity
uint256 totalPool = round.totalBullAmount + round.totalBearAmount
// totalPool = 6 ETH + 4 ETH = 10 ETH

uint256 treasuryAmount = (totalPool * TREASURY_FEE) / 100
// treasuryAmount = 10 * 3 / 100 = 0.3 ETH

uint256 netPool = totalPool - treasuryAmount
// netPool = 10 - 0.3 = 9.7 ETH

uint256 winningPool = round.totalBullAmount  // Bull won
// winningPool = 6 ETH

uint256 reward = (netPool * bet.amount) / winningPool
// reward = (9.7 * 1) / 6 = 1.6167 ETH
```

#### Step 7: State Writes
```solidity
// Before: hasClaimed[BTC][50][0x123...] = false
hasClaimed[coin][roundId][msg.sender] = true
// After: hasClaimed[BTC][50][0x123...] = true

// Before: bet.claimed = false
bet.claimed = true
// After: bet.claimed = true
```

#### Step 8: Transfer ETH
```solidity
(bool success, ) = msg.sender.call{value: reward}("");
require(success, "Transfer failed")
```

**State Changes:**
```
Contract Balance:  10 ETH → 8.3833 ETH
User Balance:      5 ETH → 6.6167 ETH
```

**⚠️ FAIL CASE #6: Contract has insufficient balance**
- Happens if calculation error or previous drain
- Transaction reverts

**⚠️ FAIL CASE #7: User's wallet rejects transfer**
- Smart contract wallet with payable restrictions
- Transaction reverts: "Transfer failed"

#### Step 9: Event Emission
```solidity
emit RewardClaimed(
    msg.sender,  // 0x123...
    coin,        // BTC (0)
    roundId,     // 50
    reward       // 1616700000000000000 (1.6167 ETH)
)
```

#### Step 10: Reentrancy Guard Released
```solidity
_status = _NOT_ENTERED
```

#### Step 11: Final State
```
✅ User received 1.6167 ETH (profit: 0.6167 ETH)
✅ Marked as claimed (cannot claim again)
✅ Contract balance reduced
✅ Frontend shows: "✅ Claimed!"
```

---

## 🔄 Interaction Flow #5: Creating Next Round

### Automation Script Calls `createNextRound()`

#### When This Happens
```javascript
// After closing Round #50:
if (round.status === 2) {  // Closed
    const nextRoundId = currentRound[BTC] + 1
    const nextRound = await getRound(BTC, nextRoundId)
    
    if (nextRound.roundId === 0) {  // Doesn't exist
        await market.createNextRound(BTC)
    }
}
```

#### Step 1: State Reads
1. ✅ `currentRound[BTC]` → 50

#### Step 2: Calculate New Round ID
```solidity
uint256 previousRoundId = currentRound[coin];  // 50
uint256 newRoundId = previousRoundId + 1;      // 51
```

#### Step 3: Create Round with Timestamps
```solidity
uint256 startTime = block.timestamp;         // 1769850300
uint256 lockTime = startTime + 5 minutes;    // 1769850600
uint256 closeTime = lockTime + 5 minutes;    // 1769850900
```

#### Step 4: State Writes (Initialize New Round)
```solidity
// Before: rounds[BTC][51] = undefined (all zeros)

rounds[coin][newRoundId] = Round({
    roundId: newRoundId,              // 51
    coin: coin,                       // BTC (0)
    startTimestamp: startTime,        // 1769850300
    lockTimestamp: lockTime,          // 1769850600
    closeTimestamp: closeTime,        // 1769850900
    lockPrice: 0,                     // Will be set on lock
    closePrice: 0,                    // Will be set on close
    totalBullAmount: 0,               // No bets yet
    totalBearAmount: 0,               // No bets yet
    oracleCalled: false,              // Not closed yet
    status: RoundStatus.Open          // 0 (Open for betting)
})

// After: rounds[BTC][51] = { roundId: 51, coin: 0, startTimestamp: 1769850300, ... }
```

#### Step 5: Update Current Round Pointer
```solidity
// Before: currentRound[BTC] = 50
currentRound[coin] = newRoundId
// After: currentRound[BTC] = 51
```

#### Step 6: Event Emission
```solidity
emit RoundCreated(
    coin,       // BTC (0)
    newRoundId, // 51
    startTime,  // 1769850300
    lockTime,   // 1769850600
    closeTime   // 1769850900
)
```

#### Step 7: Frontend Updates
- Wagmi refetches `currentRound(BTC)` → 51
- Fetches `getRound(BTC, 51)` → New NEXT round
- UI shows new blue "NEXT" card
- Users can now bet on Round #51

---

## ⚠️ Edge Cases & Failure Scenarios

### Edge Case #1: Betting in Last Second Before Lock
```
Timeline:
10:04:59 - User clicks "Enter UP"
10:05:00 - Transaction enters mempool
10:05:01 - Automation locks round
10:05:02 - User's bet transaction is mined

Result: ❌ Transaction reverts: "Round is locked"
```

**Why:** `block.timestamp` when transaction executes is 10:05:02, which is >= `lockTimestamp`

**Solution:** Frontend should disable betting 30 seconds before lock

### Edge Case #2: Price Doesn't Change (Tie)
```
Lock Price:  $98,000.00
Close Price: $98,000.00

Winner: Position.Tie (neither side)
```

**What happens when claiming:**
```solidity
if (winner == Position.Tie) {
    reward = bet.amount  // 100% refund, no fee
}
```

**Result:** Everyone gets full refund, no one profits, no treasury fee

### Edge Case #3: One-Sided Betting (All Bull, No Bear)
```
Total Bull: 10 ETH
Total Bear: 0 ETH

Bull wins
```

**What happens:**
```solidity
uint256 totalPool = 10 + 0 = 10 ETH
uint256 treasuryFee = 10 * 3% = 0.3 ETH
uint256 netPool = 9.7 ETH
uint256 winningPool = 10 ETH

reward = (9.7 * bet.amount) / 10
       = 0.97 * bet.amount
```

**Result:** Winners only get 97% back (lose 3% to treasury fee)

**⚠️ This is bad UX** - should prevent or warn users

### Edge Case #4: Extremely Tiny Bets (Rounding Errors)
```
User bets: 0.01 ETH (minimum)
Total pool: 10,000 ETH
Winning pool: 5,000 ETH

reward = (9,700 * 0.01) / 5,000 = 0.0194 ETH
```

**Solidity integer division:**
```solidity
// No decimals, rounds down
0.0194 ETH in wei = 19,400,000,000,000,000
Still accurate at this level
```

**But if:**
```
reward = (9,700 * 0.000001) / 5,000 = 0.00000194 ETH
In wei: 1,940,000,000

If calculation rounds down to 1,930,000,000
User loses 10,000,000 wei (0.00000001 ETH = ~$0.00003)
```

**Mitigation:** MIN_BET_AMOUNT = 0.01 ETH keeps rounding errors negligible

### Edge Case #5: Blockchain Time Manipulation
```
Miner can manipulate block.timestamp by ±15 seconds

Example:
Real time:  10:04:55
Miner sets: 10:05:05 (fast forward 10 seconds)

Result: Round locks early, user's bet at 10:04:58 fails
```

**Mitigation:**
- Ethereum consensus rules limit timestamp drift
- 5-minute windows make ±15 seconds insignificant (~5% variance)
- Critical for shorter rounds (would be risky with 1-minute rounds)

### Edge Case #6: Oracle Failure During Lock/Close
```
Oracle returns:
- price = 0
- timestamp = 0
- Or call reverts
```

**What happens:**
```solidity
(, int256 price, , uint256 timestamp, ) = oracle.latestRoundData()
// If price = 0 → Round locks with lockPrice = 0
```

**Implications:**
- **Lock:** lockPrice = 0, round proceeds
- **Close:** closePrice = 0
- If lockPrice = 0 and closePrice = 0 → **TIE** (everyone refunded)
- If lockPrice = 98000 and closePrice = 0 → **BEAR WINS** (incorrect!)

**🔴 Critical vulnerability in production!**

**Solution needed:**
```solidity
require(price > 0, "Invalid oracle price")
require(timestamp > 0, "Invalid oracle timestamp")
require(block.timestamp - timestamp < 5 minutes, "Stale price")
```

### Edge Case #7: Contract Runs Out of ETH (Insolvency)
```
Scenario:
- 10 winners should each get 1 ETH
- Contract only has 5 ETH

What happens:
- First 5 claimers succeed
- Last 5 claimers fail: "Transfer failed"
```

**Why this can happen:**
- Bug in reward calculation
- Re-entrancy exploit (prevented by ReentrancyGuard)
- Owner withdraws funds (no withdrawal function exists, good!)

**Current protection:**
- ReentrancyGuard prevents re-entrancy drain
- No owner withdrawal function
- Only way out is through proper claim flow

**But still vulnerable if:**
- Calculation bug causes over-payment
- Multiple rounds claim from same pool

### Edge Case #8: Gas Price Spike During Claim
```
User clicks "Collect" when gas is cheap: 20 gwei
Transaction sits in mempool
Gas spikes to 500 gwei
Transaction finally executes

Gas cost: 150,000 gas * 500 gwei = 0.075 ETH (~$225)
Reward: 0.05 ETH
Net loss: -0.025 ETH
```

**Mitigation:**
- Frontend should warn about gas costs
- User can set gas limit
- Consider claiming multiple rounds in one tx (batch claim)

### Edge Case #9: User Bets Then Immediately Tries to Cancel
```
User bets 10 ETH by mistake
Tries to cancel within 1 second

Result: ❌ No cancel function exists
```

**Current behavior:**
- Bet is final
- No refunds until round closes (and only if win or tie)
- Funds locked for minimum 5 minutes

**Possible improvement:**
- Add `cancelBet()` function (only allowed before lock)
- Small cancellation fee (e.g., 0.5%) to prevent spam

---

## 🎭 State Transition Matrix

### Round Status Transitions

```
         ┌─────────────────────────────────────┐
         │           Round Status              │
         └─────────────────────────────────────┘

         ┌──────────┐
         │   OPEN   │ ← Initial state after createNextRound()
         │  (0)     │
         └──────────┘
              │
              │ lockRound()
              │ ✓ block.timestamp >= lockTimestamp
              │ ✓ status == OPEN
              ↓
         ┌──────────┐
         │  LOCKED  │
         │  (1)     │
         └──────────┘
              │
              │ closeRound()
              │ ✓ block.timestamp >= closeTimestamp
              │ ✓ status == LOCKED
              │ ✓ !oracleCalled
              ↓
         ┌──────────┐
         │  CLOSED  │ ← Final state (no further transitions)
         │  (2)     │
         └──────────┘

Invalid Transitions:
OPEN → CLOSED  ❌ (must lock first)
LOCKED → OPEN  ❌ (cannot reopen)
CLOSED → OPEN  ❌ (cannot reopen)
CLOSED → LOCKED ❌ (final state)
```

### User Bet Status Transitions

```
┌─────────────────────────────────────────────────────────┐
│                  User Bet Lifecycle                     │
└─────────────────────────────────────────────────────────┘

  [No Bet]
     │
     │ bet() called
     ↓
  [Bet Placed]
  ├─ hasBet[coin][round][user] = true
  ├─ bets[coin][round][user].amount > 0
  └─ bets[coin][round][user].claimed = false
     │
     │ Round closes
     │ (automatic, no user action)
     ↓
  [Awaiting Claim]
  ├─ Round.status = CLOSED
  ├─ Round.oracleCalled = true
  └─ Winner determined
     │
     ├─ IF WINNER ────┐
     │                 ↓
     │            [Can Claim]
     │                 │
     │                 │ claim() called
     │                 ↓
     │            [Claimed]
     │            ├─ hasClaimed[coin][round][user] = true
     │            ├─ bets[coin][round][user].claimed = true
     │            └─ ETH transferred to user
     │
     └─ IF LOSER ─────→ [Cannot Claim]
                        └─ claim() would revert: "Not a winner"
```

---

## 🔍 Storage Layout Analysis

### What Gets Stored Where

```solidity
// Slot-efficient packing

// SLOAD costs: 2100 gas (cold) or 100 gas (warm)
// SSTORE costs: 20,000 gas (new), 5,000 gas (update), 2,900 gas (delete)

// EXPENSIVE READS:
currentRound[coin]                    // 1 SLOAD
rounds[coin][roundId]                 // 1 SLOAD per field (9 fields = 9 SLOADs)
bets[coin][roundId][user]             // 1 SLOAD per field (4 fields = 4 SLOADs)

// EXPENSIVE WRITES:
rounds[coin][roundId].totalBullAmount += amount  // 1 SLOAD + 1 SSTORE
hasBet[coin][roundId][user] = true              // 1 SSTORE (20,000 gas)
hasClaimed[coin][roundId][user] = true          // 1 SSTORE (20,000 gas)
```

### Gas Optimization Opportunities

**Current:**
```solidity
Round storage round = rounds[coin][roundId];  // Load once
round.totalBullAmount += msg.value             // 1 SSTORE
round.status = RoundStatus.Locked              // 1 SSTORE
```

**Optimized (if needed):**
```solidity
// Pack status (uint8) with other small values in same slot
struct Round {
    uint256 roundId;
    uint8 coin;          // Save 31 bytes
    uint8 status;        // Save 31 bytes
    uint48 startTimestamp;  // Enough until year 8921 AD!
    uint48 lockTimestamp;
    uint48 closeTimestamp;
    int256 lockPrice;
    int256 closePrice;
    uint128 totalBullAmount;  // Max 340 trillion ETH (enough!)
    uint128 totalBearAmount;
    bool oracleCalled;
}
// Could save ~3-4 storage slots per round
```

---

## 👥 Multi-User Interaction Scenarios

### Scenario #1: Race Condition - Two Users Bet Simultaneously

```
Time: 10:03:45.123

User A (0xAAA...): bet(BTC, Bull, 1 ETH)  ← Transaction enters mempool
User B (0xBBB...): bet(BTC, Bull, 2 ETH)  ← Transaction enters mempool

Block mined at 10:03:46
```

**What happens in the block:**

```
Transaction Order (determined by gas price or miner):
1. User B's tx executes first (higher gas price)
2. User A's tx executes second

Execution Trace:

[User B's Transaction]
├─ SLOAD: rounds[BTC][50].totalBullAmount = 5 ETH
├─ ADD: 5 + 2 = 7 ETH
├─ SSTORE: rounds[BTC][50].totalBullAmount = 7 ETH
├─ SSTORE: bets[BTC][50][0xBBB] = { amount: 2 ETH, ... }
└─ SSTORE: hasBet[BTC][50][0xBBB] = true

[User A's Transaction]
├─ SLOAD: rounds[BTC][50].totalBullAmount = 7 ETH  ← See User B's update!
├─ ADD: 7 + 1 = 8 ETH
├─ SSTORE: rounds[BTC][50].totalBullAmount = 8 ETH
├─ SSTORE: bets[BTC][50][0xAAA] = { amount: 1 ETH, ... }
└─ SSTORE: hasBet[BTC][50][0xAAA] = true
```

**Result:**
- ✅ Both bets succeed
- ✅ Total updates correctly: 5 → 7 → 8 ETH
- ✅ No race condition issues due to `storage` keyword (Solidity handles this safely)

---

### Scenario #2: User Tries to Bet Twice in Same Block

```
User A creates 2 transactions:
1. bet(BTC, Bull, 1 ETH) - nonce: 100
2. bet(BTC, Bull, 2 ETH) - nonce: 101

Both included in same block
```

**Execution:**

```
[First Transaction - nonce 100]
✅ hasBet[BTC][50][UserA] = false → passes
✅ Bet succeeds
✅ hasBet[BTC][50][UserA] = true

[Second Transaction - nonce 101]
❌ hasBet[BTC][50][UserA] = true → reverts
❌ Transaction fails: "Already bet in this round"
```

**Result:**
- First bet succeeds
- Second bet reverts
- User wastes gas on second transaction

---

### Scenario #3: Lock Happens While User Is Betting

```
Timeline:
10:04:59.500 - User clicks "Enter UP"
10:04:59.800 - User's bet tx enters mempool (pending)
10:05:00.000 - Automation's lockRound tx enters mempool (higher gas)
10:05:00.100 - Block mined

Transaction order in block:
1. lockRound() executes first
2. bet() executes second
```

**Execution:**

```
[lockRound Transaction]
✅ Executes at timestamp 10:05:00
✅ round.status = LOCKED
✅ round.lockPrice = $98,000

[bet Transaction]
❌ require(round.status == RoundStatus.Open)  → reverts
❌ require(block.timestamp < lockTimestamp)   → reverts
```

**Result:**
- User's bet fails
- User loses gas (estimated ~50,000 gas)
- User sees error in MetaMask
- Frontend should refetch and show "Round is locked"

**Prevention:**
- Frontend disables betting 30 seconds before lock
- Show countdown warning: "⚠️ Betting closes in 30s"

---

### Scenario #4: Multiple Users Claim Simultaneously

```
Round closed: Bull wins
Winners:
- User A: bet 1 ETH
- User B: bet 2 ETH  
- User C: bet 3 ETH

Total Bull pool: 6 ETH
Prize pool: 10 ETH (6 Bull + 4 Bear)
Net pool: 9.7 ETH (after 3% fee)

All click "Collect" at same time
```

**Block execution:**

```
Contract balance before: 10 ETH

[User A claims]
├─ Calculate: reward = 9.7 * 1 / 6 = 1.617 ETH
├─ hasClaimed[BTC][50][UserA] = true
├─ Transfer 1.617 ETH to UserA
└─ Contract balance: 10 - 1.617 = 8.383 ETH

[User B claims]
├─ Calculate: reward = 9.7 * 2 / 6 = 3.233 ETH
├─ hasClaimed[BTC][50][UserB] = true
├─ Transfer 3.233 ETH to UserB
└─ Contract balance: 8.383 - 3.233 = 5.150 ETH

[User C claims]
├─ Calculate: reward = 9.7 * 3 / 6 = 4.850 ETH
├─ hasClaimed[BTC][50][UserC] = true
├─ Transfer 4.850 ETH to UserC
└─ Contract balance: 5.150 - 4.850 = 0.300 ETH (treasury)
```

**Result:**
- ✅ All claims succeed
- ✅ Correct payouts
- ✅ Remaining 0.3 ETH is treasury fee
- ✅ No one can claim twice (hasClaimed prevents it)

---

### Scenario #5: User Bets from Contract Address (Smart Wallet)

```
User uses Gnosis Safe (multi-sig wallet):
- Address: 0xSAFE...
- Requires 2/3 signatures to execute

User initiates bet(BTC, Bull, 10 ETH)
```

**Execution:**

```
[bet() executes]
✅ msg.sender = 0xSAFE... (contract address)
✅ msg.value = 10 ETH
✅ Bet recorded for 0xSAFE...

[Round closes, Bull wins]

[claim() executes]
✅ Calculate reward: 15 ETH
✅ hasClaimed[BTC][50][0xSAFE...] = true
├─ Transfer: call{value: 15 ETH}(0xSAFE...)
└─ 0xSAFE receives ETH via fallback/receive function
```

**⚠️ Potential Issue:**
```solidity
(bool success, ) = msg.sender.call{value: reward}("");
require(success, "Transfer failed");
```

If Gnosis Safe's `receive()` function:
- Reverts (no receive function)
- Has expensive logic (>2300 gas with old transfer())
- Is paused or restricted

**Result:** Claim would fail!

**Mitigation:**
- Use `call` (no gas limit) ✅ Already doing this
- Or implement pull-payment pattern (user withdraws from contract)

---

### Scenario #6: Oracle Price Changes Between Lock and Close

```
Lock time (10:05:00):
Oracle returns: $98,000

Close time (10:10:00):
Oracle returns: $98,100

But what if we check at 10:09:59?
Oracle still shows: $98,000
```

**Timing issue:**

```
Real world:
10:04:58 - Price is $98,000
10:05:00 - lockRound() → lockPrice = $98,000 ✅
10:09:58 - Price is still $98,000
10:10:00 - closeRound() → closePrice = $98,000
          → TIE (refund everyone)

But in reality, price did change (just not captured)
```

**This is expected behavior:**
- Oracle updates every X seconds (e.g., every 10 seconds)
- Price might not change within 5-minute window
- This is a feature, not a bug (markets need volatility to be interesting)

---

### Scenario #7: Automation Script Fails/Crashes

```
Scenario:
- Round should lock at 10:05:00
- Automation script crashes at 10:04:30
- Round never gets locked

What happens?
```

**Contract state:**
```
Round #50 status: OPEN
block.timestamp: 10:06:00 (1 minute past lock time)

Users can still bet! ❌
- UI shows "Round is locked" (based on timestamp)
- But contract allows bets (status still OPEN)
```

**When automation restarts:**
```
10:15:00 - Automation script restarts
          - Checks round: status=OPEN, now >= lockTimestamp
          - Calls lockRound()
          - ✅ Round finally locks (10 minutes late!)
          - closeTimestamp still = lockTimestamp + 5 minutes
          - But effective betting time was 15 minutes instead of 5
```

**Impact:**
- Users who bet between 10:05-10:15 got extra time (unfair advantage)
- More bets collected (larger prize pool)
- Close time extends to 10:20:00 (10 minutes late)

**Mitigation:**
- Run automation on multiple servers (redundancy)
- Use Chainlink Keepers (decentralized automation)
- Add health checks and alerts

---

### Scenario #8: Front-Running Attack

```
Malicious bot watches mempool:

10:04:59 - Sees large bet incoming:
           bet(BTC, Bull, 100 ETH) from Whale

Bot strategy:
1. Place same-side bet with higher gas before whale
2. After round closes (if wins), claim immediately
3. Profit from whale's bet increasing the pool
```

**Execution:**

```
Mempool:
[Pending] Whale: bet(BTC, Bull, 100 ETH) - 50 gwei gas
[Pending] Bot: bet(BTC, Bull, 10 ETH) - 100 gwei gas  ← Higher gas!

Block mined:
1. Bot's bet executes first
   - totalBull = 50 → 60 ETH
2. Whale's bet executes
   - totalBull = 60 → 160 ETH

Round closes: Bull wins
totalBull: 160 ETH
totalBear: 40 ETH
netPool: 194 ETH (after 3% fee)

Bot's reward: 194 * 10 / 160 = 12.125 ETH (2.125 ETH profit)
```

**Is this an attack?**
- ❌ Not really - bot took same risk as whale
- ✅ Actually helps by increasing prize pool for all winners
- This is MEV (Maximal Extractable Value), common in DeFi

**Real attack vector:**
- Bot sees ORACLE PRICE UPDATE in mempool
- Bot knows price moved from $98k → $99k
- Bot bets Bull before lock with high gas
- **This is insider trading!**

**Mitigation:**
- Use commit-reveal scheme (bet first, reveal position later)
- Batch bets together (harder to front-run)
- Flashbots (private transaction pool)

---

## ⛽ Gas Cost Analysis

### Typical Transaction Costs

```
Function              | Gas Used | At 50 gwei | At 200 gwei | At 500 gwei
--------------------- |----------|------------|-------------|-------------
bet()                 | ~100,000 | $1.50      | $6.00       | $15.00
claim()               | ~80,000  | $1.20      | $4.80       | $12.00
lockRound()           | ~120,000 | $1.80      | $7.20       | $18.00
closeRound()          | ~130,000 | $1.95      | $7.80       | $19.50
createNextRound()     | ~150,000 | $2.25      | $9.00       | $22.50

(Assumes ETH = $3,000)
```

### Gas Breakdown by Operation

#### bet() Function
```
Operation                                    | Gas Cost
--------------------------------------------|----------
Function call overhead                       | ~21,000
Access control checks                        | ~2,100
Load currentRound[coin]                      | ~2,100 (cold SLOAD)
Load rounds[coin][roundId] (9 fields)        | ~18,900 (9 × 2,100)
Validation checks (5 requires)               | ~5,000
Create bet struct (4 fields)                 | ~20,000 (cold SSTORE)
Update round.totalBullAmount                 | ~5,000 (warm SSTORE)
Set hasBet mapping                           | ~20,000 (cold SSTORE)
Emit BetPlaced event                         | ~3,000
Memory operations                            | ~3,000
--------------------------------------------|----------
TOTAL                                        | ~100,000 gas
```

#### claim() Function
```
Operation                                    | Gas Cost
--------------------------------------------|----------
ReentrancyGuard: set _status = ENTERED       | ~20,000 (cold SSTORE)
Load bet data (4 fields)                     | ~8,400 (4 × 2,100)
Load round data (9 fields)                   | ~18,900
Validation checks (5 requires)               | ~5,000
Calculate reward (math operations)           | ~1,000
Set hasClaimed mapping                       | ~20,000 (cold SSTORE)
Update bet.claimed                           | ~5,000 (warm SSTORE)
ETH transfer (CALL)                          | ~9,000
Emit RewardClaimed event                     | ~3,000
ReentrancyGuard: set _status = NOT_ENTERED   | ~2,900 (refund)
--------------------------------------------|----------
TOTAL                                        | ~93,200 gas
```

### Gas Optimization: First Bet vs Second Bet

```
User A (first bet in round):
├─ Cold SLOAD: rounds[BTC][50] → 2,100 gas
├─ Cold SSTORE: bets[BTC][50][UserA] → 20,000 gas
├─ Cold SSTORE: hasBet[BTC][50][UserA] → 20,000 gas
└─ TOTAL: ~100,000 gas

User B (second bet in round):
├─ Warm SLOAD: rounds[BTC][50] → 100 gas ✅ (already loaded by User A)
├─ Cold SSTORE: bets[BTC][50][UserB] → 20,000 gas
├─ Warm SSTORE: round.totalBullAmount → 2,900 gas ✅ (already written)
├─ Cold SSTORE: hasBet[BTC][50][UserB] → 20,000 gas
└─ TOTAL: ~70,000 gas ✅ 30% cheaper!
```

### Cost-Benefit Analysis

```
User bets 1 ETH:

Scenario 1: WIN (2x payout)
├─ Bet cost: 1 ETH
├─ Gas cost: 0.005 ETH (100k gas @ 50 gwei)
├─ Reward: 1.94 ETH (after 3% fee)
├─ Claim gas: 0.004 ETH (80k gas @ 50 gwei)
├─ Total cost: 1.009 ETH
├─ Total return: 1.94 ETH
└─ NET PROFIT: +0.931 ETH (+92% ROI) ✅

Scenario 2: LOSE
├─ Bet cost: 1 ETH
├─ Gas cost: 0.005 ETH
├─ Total loss: -1.005 ETH (-100% ROI) ❌

Scenario 3: MINIMUM BET (0.01 ETH)
├─ Bet cost: 0.01 ETH
├─ Gas cost: 0.005 ETH (50% of bet!) ⚠️
├─ If win (2x): 0.0194 ETH
├─ After claim gas: 0.0154 ETH return
└─ NET PROFIT: +0.0004 ETH (+4% ROI) ❌ Not worth it!
```

**Key insight:** Gas costs make small bets unprofitable!

Minimum viable bet (at 50 gwei gas, 2x payout):
```
Bet: 0.1 ETH
Gas: 0.005 ETH (5% of bet) ✅ Acceptable
Reward: 0.194 ETH
Net: +0.089 ETH (+89% ROI) ✅
```

---

## 🔄 Complete Round Lifecycle (All Interactions)

### Round #50 - Complete State Changes Timeline

```
═══════════════════════════════════════════════════════════════════════
T = 0:00 | createNextRound(BTC)
═══════════════════════════════════════════════════════════════════════

STATE WRITES:
✓ currentRound[BTC]: 49 → 50
✓ rounds[BTC][50].roundId: 0 → 50
✓ rounds[BTC][50].coin: 0 → 0 (BTC)
✓ rounds[BTC][50].startTimestamp: 0 → 1769850000
✓ rounds[BTC][50].lockTimestamp: 0 → 1769850300
✓ rounds[BTC][50].closeTimestamp: 0 → 1769850600
✓ rounds[BTC][50].status: 0 → 0 (Open)
✓ rounds[BTC][50].totalBullAmount: 0 → 0
✓ rounds[BTC][50].totalBearAmount: 0 → 0
✓ rounds[BTC][50].oracleCalled: false → false

EVENTS: RoundCreated(BTC, 50, 1769850000, 1769850300, 1769850600)
GAS: ~150,000

═══════════════════════════════════════════════════════════════════════
T = 1:30 | User1: bet(BTC, Bull, 2 ETH)
═══════════════════════════════════════════════════════════════════════

STATE READS:
✓ currentRound[BTC] → 50
✓ rounds[BTC][50] → {roundId: 50, status: 0, lockTimestamp: 300, ...}
✓ hasBet[BTC][50][User1] → false

VALIDATIONS:
✓ round.roundId != 0
✓ round.status == Open (0)
✓ block.timestamp (90) < lockTimestamp (300) ✅
✓ msg.value (2 ETH) >= MIN_BET (0.01 ETH) ✅
✓ !hasBet[BTC][50][User1] ✅

STATE WRITES:
✓ bets[BTC][50][User1].user: 0x0 → 0xUser1
✓ bets[BTC][50][User1].amount: 0 → 2 ETH
✓ bets[BTC][50][User1].position: 0 → 0 (Bull)
✓ bets[BTC][50][User1].claimed: false → false
✓ rounds[BTC][50].totalBullAmount: 0 → 2 ETH
✓ hasBet[BTC][50][User1]: false → true

ETH TRANSFER:
✓ User1 balance: 100 ETH → 98 ETH
✓ Contract balance: 50 ETH → 52 ETH

EVENTS: BetPlaced(User1, BTC, 50, Bull, 2 ETH)
GAS: ~100,000

═══════════════════════════════════════════════════════════════════════
T = 2:45 | User2: bet(BTC, Bear, 3 ETH)
═══════════════════════════════════════════════════════════════════════

STATE READS:
✓ currentRound[BTC] → 50
✓ rounds[BTC][50] → {totalBullAmount: 2 ETH, totalBearAmount: 0, ...}
✓ hasBet[BTC][50][User2] → false

STATE WRITES:
✓ bets[BTC][50][User2].user: 0x0 → 0xUser2
✓ bets[BTC][50][User2].amount: 0 → 3 ETH
✓ bets[BTC][50][User2].position: 0 → 1 (Bear)
✓ rounds[BTC][50].totalBearAmount: 0 → 3 ETH
✓ hasBet[BTC][50][User2]: false → true

ETH TRANSFER:
✓ User2 balance: 50 ETH → 47 ETH
✓ Contract balance: 52 ETH → 55 ETH

EVENTS: BetPlaced(User2, BTC, 50, Bear, 3 ETH)
GAS: ~70,000 (warm storage)

═══════════════════════════════════════════════════════════════════════
T = 4:20 | User3: bet(BTC, Bull, 1 ETH)
═══════════════════════════════════════════════════════════════════════

STATE WRITES:
✓ bets[BTC][50][User3] → { user: User3, amount: 1 ETH, position: Bull, claimed: false }
✓ rounds[BTC][50].totalBullAmount: 2 ETH → 3 ETH
✓ hasBet[BTC][50][User3]: false → true

ETH TRANSFER:
✓ User3 balance: 25 ETH → 24 ETH
✓ Contract balance: 55 ETH → 56 ETH

CURRENT STATE:
- totalBullAmount: 3 ETH (User1: 2 ETH, User3: 1 ETH)
- totalBearAmount: 3 ETH (User2: 3 ETH)
- Total Prize Pool: 6 ETH

═══════════════════════════════════════════════════════════════════════
T = 5:00 | Automation: lockRound(BTC, 50)
═══════════════════════════════════════════════════════════════════════

STATE READS:
✓ rounds[BTC][50] → {status: 0, lockTimestamp: 300, ...}

VALIDATIONS:
✓ msg.sender == owner ✅
✓ round.status == Open (0) ✅
✓ block.timestamp (300) >= lockTimestamp (300) ✅

EXTERNAL CALL:
✓ btcOracle.latestRoundData()
  └─ Returns: (roundId: 12345, price: 98000_00000000, timestamp: 300, ...)

STATE WRITES:
✓ rounds[BTC][50].lockPrice: 0 → 98000_00000000
✓ rounds[BTC][50].status: 0 (Open) → 1 (Locked)

EVENTS: RoundLocked(BTC, 50, 98000_00000000, 300)
GAS: ~120,000

IMPACT:
✗ New bets will revert: "Round is locked"
✓ Existing bets safe
✓ Round enters "LIVE" phase

═══════════════════════════════════════════════════════════════════════
T = 5:01 | User4 attempts: bet(BTC, Bull, 5 ETH)
═══════════════════════════════════════════════════════════════════════

STATE READS:
✓ rounds[BTC][50].status → 1 (Locked)

VALIDATIONS:
✗ round.status == Open → FALSE (is Locked)

RESULT: ❌ Transaction reverts: "Round not open"
GAS WASTED: ~23,000 (revert)
User4 balance unchanged

═══════════════════════════════════════════════════════════════════════
T = 5:00 - 10:00 | Oracle price fluctuates
═══════════════════════════════════════════════════════════════════════

Mock price updates (every 10 seconds):
05:00 → $98,000
05:10 → $98,002 (+$2)
05:20 → $98,001 (-$1)
...
09:50 → $98,098 (+$1)
10:00 → $98,100 (+$2)

No contract interactions (waiting for close)

═══════════════════════════════════════════════════════════════════════
T = 10:00 | Automation: closeRound(BTC, 50)
═══════════════════════════════════════════════════════════════════════

STATE READS:
✓ rounds[BTC][50] → {status: 1, closeTimestamp: 600, oracleCalled: false}

VALIDATIONS:
✓ round.status == Locked (1) ✅
✓ block.timestamp (600) >= closeTimestamp (600) ✅
✓ !oracleCalled ✅

EXTERNAL CALL:
✓ btcOracle.latestRoundData()
  └─ Returns: (roundId: 12400, price: 98100_00000000, timestamp: 600, ...)

WINNER CALCULATION:
closePrice (98100) > lockPrice (98000)
→ Winner = Position.Bull (0)

STATE WRITES:
✓ rounds[BTC][50].closePrice: 0 → 98100_00000000
✓ rounds[BTC][50].status: 1 (Locked) → 2 (Closed)
✓ rounds[BTC][50].oracleCalled: false → true

EVENTS: RoundClosed(BTC, 50, 98100_00000000, Bull, 600)
GAS: ~130,000

WINNERS: User1 (2 ETH), User3 (1 ETH)
LOSERS: User2 (3 ETH)

═══════════════════════════════════════════════════════════════════════
T = 10:30 | User1: claim(BTC, 50)
═══════════════════════════════════════════════════════════════════════

STATE READS:
✓ ReentrancyGuard._status → _NOT_ENTERED
✓ bets[BTC][50][User1] → {user: User1, amount: 2 ETH, position: Bull}
✓ rounds[BTC][50] → {status: 2, lockPrice: 98000, closePrice: 98100, totalBull: 3, totalBear: 3}
✓ hasClaimed[BTC][50][User1] → false

VALIDATIONS:
✓ bet.user != 0x0 ✅
✓ round.status == Closed (2) ✅
✓ round.oracleCalled == true ✅
✓ !hasClaimed ✅

WINNER CHECK:
closePrice (98100) > lockPrice (98000) → Winner = Bull
bet.position (Bull) == winner (Bull) ✅

REWARD CALCULATION:
totalPool = 3 + 3 = 6 ETH
treasuryFee = 6 * 3% = 0.18 ETH
netPool = 6 - 0.18 = 5.82 ETH
winningPool = 3 ETH (Bull)
reward = (5.82 * 2) / 3 = 3.88 ETH

STATE WRITES:
✓ ReentrancyGuard._status: _NOT_ENTERED → _ENTERED
✓ hasClaimed[BTC][50][User1]: false → true
✓ bets[BTC][50][User1].claimed: false → true

ETH TRANSFER:
✓ contract.call{value: 3.88 ETH}(User1)
✓ Contract balance: 56 ETH → 52.12 ETH
✓ User1 balance: 98 ETH → 101.88 ETH

STATE WRITES:
✓ ReentrancyGuard._status: _ENTERED → _NOT_ENTERED

EVENTS: RewardClaimed(User1, BTC, 50, 3.88 ETH)
GAS: ~80,000

USER1 PROFIT:
Invested: 2 ETH
Received: 3.88 ETH
Profit: +1.88 ETH (+94% ROI) ✅

═══════════════════════════════════════════════════════════════════════
T = 11:00 | User3: claim(BTC, 50)
═══════════════════════════════════════════════════════════════════════

REWARD CALCULATION:
reward = (5.82 * 1) / 3 = 1.94 ETH

ETH TRANSFER:
✓ Contract balance: 52.12 ETH → 50.18 ETH
✓ User3 balance: 24 ETH → 25.94 ETH

USER3 PROFIT:
Invested: 1 ETH
Received: 1.94 ETH
Profit: +0.94 ETH (+94% ROI) ✅

═══════════════════════════════════════════════════════════════════════
T = 12:00 | User2 attempts: claim(BTC, 50)
═══════════════════════════════════════════════════════════════════════

STATE READS:
✓ bets[BTC][50][User2].position → Bear (1)

WINNER CHECK:
Winner = Bull (0)
bet.position (Bear) == winner (Bull) → FALSE ✗

RESULT: ❌ Transaction reverts: "Not a winner"
GAS WASTED: ~40,000
User2 balance unchanged

USER2 LOSS:
Invested: 3 ETH
Received: 0 ETH
Loss: -3 ETH (-100%) ❌

═══════════════════════════════════════════════════════════════════════
FINAL ACCOUNTING
═══════════════════════════════════════════════════════════════════════

Prize Pool Distribution:
├─ Total collected: 6 ETH
├─ Treasury fee: 0.18 ETH (3%)
├─ User1 payout: 3.88 ETH
├─ User3 payout: 1.94 ETH
└─ Remaining in contract: 50.18 ETH (from other rounds)

User Balances:
├─ User1: Started 100 → Ended 101.88 (+1.88 ETH) ✅
├─ User2: Started 50 → Ended 47 (-3 ETH) ❌
└─ User3: Started 25 → Ended 25.94 (+0.94 ETH) ✅

Contract State:
✓ rounds[BTC][50].status: 2 (Closed) - PERMANENT
✓ hasClaimed[BTC][50][User1]: true - PERMANENT
✓ hasClaimed[BTC][50][User3]: true - PERMANENT
✓ hasBet[BTC][50][User1]: true - PERMANENT
✓ hasBet[BTC][50][User2]: true - PERMANENT
✓ hasBet[BTC][50][User3]: true - PERMANENT

Round #50 is now complete and immutable ✅
```

---

## 📝 Summary: What Gets Touched in Each Interaction

| Interaction | Storage Reads | Storage Writes | External Calls | ETH Transfer | Events |
|-------------|---------------|----------------|----------------|--------------|--------|
| **createNextRound()** | 1 | 10 | 0 | 0 | 1 |
| **bet()** | 3-4 | 5 | 0 | 1 (in) | 1 |
| **lockRound()** | 2-3 | 2 | 1 (oracle) | 0 | 1 |
| **closeRound()** | 2-3 | 3 | 1 (oracle) | 0 | 1 |
| **claim()** | 4-5 | 4 | 1 (transfer) | 1 (out) | 1 |

**Total for complete round lifecycle (3 users bet, 2 claim):**
- Storage Reads: ~20-25
- Storage Writes: ~30-35
- External Calls: ~5
- ETH Transfers: ~5
- Events Emitted: ~7
- Total Gas: ~750,000-850,000

---

## 🔧 Core Functions

### 1. Constructor

```solidity
constructor(
    address _btcOracle,
    address _ethOracle,
    address _bnbOracle,
    address _treasury
) Ownable(msg.sender)
```

**Flow:**
1. Sets oracle addresses (BTC, ETH, BNB)
2. Sets treasury address
3. **Initializes first round for each coin:**
   - Creates Round #1 for BTC
   - Creates Round #1 for ETH
   - Creates Round #1 for BNB
   - All start with status = OPEN

**Emits:** `RoundCreated(coin, 1, startTime, lockTime, closeTime)`

---

### 2. createNextRound()

```solidity
function createNextRound(Coin coin) external onlyOwner
```

**Purpose:** Create a new round for a specific coin

**Requirements:**
- Can only be called by owner (automation script)

**Flow:**
1. Get previous round ID
2. Increment to new round ID
3. Set timestamps:
   ```
   startTimestamp = block.timestamp
   lockTimestamp = startTimestamp + 5 minutes
   closeTimestamp = lockTimestamp + 5 minutes
   ```
4. Initialize round with:
   - `status = OPEN`
   - `totalBullAmount = 0`
   - `totalBearAmount = 0`
   - `oracleCalled = false`
5. Update `currentRound[coin]`

**Emits:** `RoundCreated(coin, roundId, startTime, lockTime, closeTime)`

**Example:**
```javascript
// Automation script calls:
await market.createNextRound(Coin.BTC)
// → Creates Round #51 for BTC
```

---

### 3. bet()

```solidity
function bet(Coin coin, Position position) 
    external 
    payable 
    nonReentrant
```

**Purpose:** Place a bet on the current round

**Requirements:**
- Round must be OPEN (status = 0)
- Current time < lockTimestamp
- Bet amount >= 0.01 ETH
- User hasn't bet in this round yet

**Flow:**
1. Get current round ID for the coin
2. Validate round is open for betting
3. Validate bet amount >= MIN_BET_AMOUNT
4. Check user hasn't already bet
5. Create bet record:
   ```solidity
   bets[coin][roundId][msg.sender] = Bet({
       user: msg.sender,
       amount: msg.value,
       position: position,
       claimed: false
   })
   ```
6. Update totals:
   ```solidity
   if (position == Bull) {
       round.totalBullAmount += msg.value
   } else {
       round.totalBearAmount += msg.value
   }
   ```
7. Mark user as having bet
8. Emit event

**Emits:** `BetPlaced(user, coin, roundId, position, amount)`

**Example:**
```javascript
// User bets 1 ETH on BTC going UP:
await market.bet(Coin.BTC, Position.Bull, { value: ethers.parseEther("1") })
```

---

### 4. lockRound()

```solidity
function lockRound(Coin coin, uint256 roundId) 
    external 
    onlyOwner
```

**Purpose:** Lock a round (stop accepting bets, start live phase)

**Requirements:**
- Round must be OPEN (status = 0)
- Current time >= lockTimestamp
- Called by owner (automation script)

**Flow:**
1. Validate round exists and is open
2. Validate lock time has arrived
3. Fetch current price from oracle:
   ```solidity
   (, int256 price, , uint256 timestamp, ) = oracle.latestRoundData()
   ```
4. Set `round.lockPrice = price`
5. Update `round.status = LOCKED`
6. Emit event

**Emits:** `RoundLocked(coin, roundId, lockPrice, timestamp)`

**Example:**
```javascript
// Automation script calls at 5-minute mark:
await market.lockRound(Coin.BTC, 50)
// → Round #50 locked at price $98,000
```

---

### 5. closeRound()

```solidity
function closeRound(Coin coin, uint256 roundId) 
    external 
    onlyOwner
```

**Purpose:** Close a round and determine winner

**Requirements:**
- Round must be LOCKED (status = 1)
- Current time >= closeTimestamp
- Oracle hasn't been called yet
- Called by owner (automation script)

**Flow:**
1. Validate round is locked
2. Validate close time has arrived
3. Validate round not already closed
4. Fetch current price from oracle:
   ```solidity
   (, int256 price, , uint256 timestamp, ) = oracle.latestRoundData()
   ```
5. Set `round.closePrice = price`
6. **Determine winner:**
   ```solidity
   if (closePrice > lockPrice) {
       winner = Position.Bull  // UP wins
   } else if (closePrice < lockPrice) {
       winner = Position.Bear  // DOWN wins
   } else {
       winner = Position.Tie   // Refund everyone
   }
   ```
7. Update round:
   ```solidity
   round.status = CLOSED
   round.oracleCalled = true
   ```
8. Emit event

**Emits:** `RoundClosed(coin, roundId, closePrice, winner, timestamp)`

**Example:**
```javascript
// Automation script calls at 10-minute mark:
await market.closeRound(Coin.BTC, 50)
// → Round #50 closed
// → lockPrice = $98,000, closePrice = $98,002
// → Winner = Bull (UP)
```

---

### 6. claim()

```solidity
function claim(Coin coin, uint256 roundId) 
    external 
    nonReentrant
```

**Purpose:** Claim winnings from a closed round

**Requirements:**
- Round must be CLOSED (status = 2)
- User must have bet in this round
- User must not have claimed yet
- User must be on winning side (or it's a tie)

**Flow:**
1. Get user's bet
2. Validate bet exists
3. Validate round is closed
4. Validate user hasn't claimed
5. **Calculate winner:**
   ```solidity
    if (closePrice > lockPrice) {
       winner = Position.Bull
    } else if (closePrice < lockPrice) {
       winner = Position.Bear
    } else {
       // Tie - refund
   }
   ```
6. **Check if user won:**
   ```solidity
   if (winner != Tie) {
       require(bet.position == winner, "Not a winner")
   }
   ```
7. **Calculate reward:**
   ```solidity
   if (winner == Tie) {
       // Refund original bet
       reward = bet.amount
   } else {
       // Calculate payout
       totalPool = totalBullAmount + totalBearAmount
       winningPool = (winner == Bull) ? totalBullAmount : totalBearAmount
       
       treasuryFee = (totalPool * TREASURY_FEE) / 100
       netPool = totalPool - treasuryFee
       
       reward = (netPool * bet.amount) / winningPool
   }
   ```
8. Mark as claimed
9. Transfer reward to user
10. Emit event

**Emits:** `RewardClaimed(user, coin, roundId, reward)`

**Example:**
```javascript
// User claims from Round #50:
await market.claim(Coin.BTC, 50)

// Calculation:
// Total pool: 10 ETH (7 Bull, 3 Bear)
// Winner: Bull
// User bet: 1 ETH on Bull
// Treasury fee: 10 × 3% = 0.3 ETH
// Net pool: 9.7 ETH
// User reward: 9.7 × (1 / 7) = 1.386 ETH ✅
```

---

### 7. View Functions

#### getCurrentPrice()
```solidity
function getCurrentPrice(Coin coin) 
    external 
    view 
    returns (int256)
```

**Purpose:** Get latest price from oracle

**Returns:** Current price with 8 decimals (e.g., 9800000000000 = $98,000.00)

---

#### getRound()
```solidity
function getRound(Coin coin, uint256 roundId) 
    external 
    view 
    returns (Round memory)
```

**Purpose:** Get complete round data

**Returns:** Round struct with all fields

---

#### getUserBet()
```solidity
function getUserBet(Coin coin, uint256 roundId, address user) 
    external 
    view 
    returns (Bet memory)
```

**Purpose:** Get user's bet for a specific round

**Returns:** Bet struct (user, amount, position, claimed)

---

#### getCurrentBlockTimestamp()
```solidity
function getCurrentBlockTimestamp() 
    external 
    view 
    returns (uint256)
```

**Purpose:** Get blockchain's current timestamp

**Returns:** `block.timestamp`

**Used by:** Frontend to sync time with blockchain

---

## 📡 Events

### RoundCreated
```solidity
event RoundCreated(
    Coin indexed coin,
    uint256 indexed roundId,
    uint256 startTimestamp,
    uint256 lockTimestamp,
    uint256 closeTimestamp
)
```

**Emitted when:** New round is created

---

### BetPlaced
```solidity
event BetPlaced(
    address indexed user,
    Coin indexed coin,
    uint256 indexed roundId,
    Position position,
    uint256 amount
)
```

**Emitted when:** User places a bet

---

### RoundLocked
```solidity
event RoundLocked(
    Coin indexed coin,
    uint256 indexed roundId,
    int256 lockPrice,
    uint256 timestamp
)
```

**Emitted when:** Round is locked (betting closes)

---

### RoundClosed
```solidity
event RoundClosed(
    Coin indexed coin,
    uint256 indexed roundId,
    int256 closePrice,
    Position winner,
    uint256 timestamp
)
```

**Emitted when:** Round is closed (winner determined)

---

### RewardClaimed
```solidity
event RewardClaimed(
    address indexed user,
    Coin indexed coin,
    uint256 indexed roundId,
    uint256 amount
)
```

**Emitted when:** User claims reward

---

## 🔒 Security Features

### 1. ReentrancyGuard
```solidity
contract MultiCoinPredictionMarket is Ownable, ReentrancyGuard
```

**Protection against:** Reentrancy attacks

**Applied to:**
- `bet()` - Prevents recursive betting during payout
- `claim()` - Prevents double-claiming via reentrancy

---

### 2. Access Control (Ownable)
```solidity
function lockRound() external onlyOwner { ... }
function closeRound() external onlyOwner { ... }
function createNextRound() external onlyOwner { ... }
```

**Ensures:**
- Only automation script can manage rounds
- Prevents random users from locking/closing rounds

---

### 3. One Bet Per Round
```solidity
mapping(Coin => mapping(uint256 => mapping(address => bool))) public hasBet;

function bet() external {
    require(!hasBet[coin][roundId][msg.sender], "Already bet in this round");
    hasBet[coin][roundId][msg.sender] = true;
}
```

**Prevents:**
- Users betting multiple times in same round
- Exploiting bet placement timing

---

### 4. One Claim Per Round
```solidity
mapping(Coin => mapping(uint256 => mapping(address => bool))) public hasClaimed;

function claim() external {
    require(!hasClaimed[coin][roundId][msg.sender], "Already claimed");
    hasClaimed[coin][roundId][msg.sender] = true;
}
```

**Prevents:**
- Double-claiming rewards
- Draining contract funds

---

### 5. Minimum Bet Amount
```solidity
uint256 public constant MIN_BET_AMOUNT = 0.01 ether;

function bet() external payable {
    require(msg.value >= MIN_BET_AMOUNT, "Bet too small");
}
```

**Prevents:**
- Spam bets with dust amounts
- Gas griefing attacks

---

### 6. Time-Based Validation
```solidity
function bet() external {
    require(block.timestamp < round.lockTimestamp, "Round is locked");
    require(round.status == RoundStatus.Open, "Round not open");
}

function lockRound() external {
    require(block.timestamp >= round.lockTimestamp, "Too early to lock");
}

function closeRound() external {
    require(block.timestamp >= round.closeTimestamp, "Too early to close");
}
```

**Ensures:**
- Rounds follow strict timeline
- No premature locking/closing
- No late betting

---

### 7. Winner Validation
```solidity
function claim() external {
    Position winner = _determineWinner(round);
    
    if (winner != Position.Tie) {
        require(bet.position == winner, "Not a winner");
    }
}
```

**Ensures:**
- Only winners can claim
- Losers cannot drain prize pool

---

## 💰 Economic Model

### Fee Structure
```
Total Prize Pool = totalBullAmount + totalBearAmount
Treasury Fee = Total Prize Pool × 3%
Net Prize Pool = Total Prize Pool - Treasury Fee
```

### Payout Calculation

#### Winning Side
```
User Payout = (Net Prize Pool × User Bet) / Winning Pool Total

Example:
- Total Pool: 10 ETH (7 Bull, 3 Bear)
- Winner: Bull
- Your Bet: 1 ETH on Bull
- Treasury: 10 × 3% = 0.3 ETH
- Net Pool: 9.7 ETH
- Your Payout: 9.7 × (1/7) = 1.386 ETH
- Profit: 0.386 ETH (38.6% return)
```

#### Losing Side
```
User loses entire bet amount
Funds go to winning pool
```

#### Tie
```
Everyone gets 100% refund
No treasury fee on ties
```

### Payout Multiplier (ROI)
```
If Bull:Bear ratio = 1:1 → 1.97x payout (97% of 2x)
If Bull:Bear ratio = 2:1 → 1.46x payout (heavy favorites get less)
If Bull:Bear ratio = 1:2 → 2.91x payout (underdogs get more)
```

---

## 🔄 Complete Round Flow

### Timeline Example (Round #50, BTC)

```
┌─────────────────────────────────────────────────────────────────┐
│ TIME   │ STATUS  │ FUNCTION CALLED      │ CONTRACT STATE        │
├─────────────────────────────────────────────────────────────────┤
│ 0:00   │ -       │ createNextRound(BTC) │ Round #50 created     │
│        │         │                      │ status = OPEN         │
│        │         │                      │ startTime = 0:00      │
│        │         │                      │ lockTime = 5:00       │
│        │         │                      │ closeTime = 10:00     │
├─────────────────────────────────────────────────────────────────┤
│ 1:30   │ OPEN    │ bet(BTC, Bull)       │ User1 bets 1 ETH UP   │
│        │         │ by User1             │ totalBull = 1 ETH     │
├─────────────────────────────────────────────────────────────────┤
│ 3:20   │ OPEN    │ bet(BTC, Bear)       │ User2 bets 2 ETH DOWN │
│        │         │ by User2             │ totalBear = 2 ETH     │
├─────────────────────────────────────────────────────────────────┤
│ 4:45   │ OPEN    │ bet(BTC, Bull)       │ User3 bets 1 ETH UP   │
│        │         │ by User3             │ totalBull = 2 ETH     │
├─────────────────────────────────────────────────────────────────┤
│ 5:00   │ LOCKED  │ lockRound(BTC, 50)   │ Betting closes        │
│        │         │ by Automation        │ lockPrice = $98,000   │
│        │         │                      │ status = LOCKED       │
├─────────────────────────────────────────────────────────────────┤
│ 6:00   │ LOCKED  │ (no calls)           │ Waiting for close...  │
│ 7:00   │ LOCKED  │ (no calls)           │ Waiting for close...  │
│ 8:00   │ LOCKED  │ (no calls)           │ Waiting for close...  │
│ 9:00   │ LOCKED  │ (no calls)           │ Waiting for close...  │
├─────────────────────────────────────────────────────────────────┤
│ 10:00  │ CLOSED  │ closeRound(BTC, 50)  │ Round closes          │
│        │         │ by Automation        │ closePrice = $98,100  │
│        │         │                      │ Winner = Bull (UP)    │
│        │         │                      │ status = CLOSED       │
│        │         │                      │ oracleCalled = true   │
├─────────────────────────────────────────────────────────────────┤
│ 10:30  │ CLOSED  │ claim(BTC, 50)       │ User1 claims:         │
│        │         │ by User1             │   Reward = 1.94 ETH   │
│        │         │                      │ hasClaimed[User1]=true│
├─────────────────────────────────────────────────────────────────┤
│ 11:00  │ CLOSED  │ claim(BTC, 50)       │ User3 claims:         │
│        │         │ by User3             │   Reward = 1.94 ETH   │
│        │         │                      │ hasClaimed[User3]=true│
└─────────────────────────────────────────────────────────────────┘

Final Accounting:
- Total Pool: 4 ETH (2 Bull + 2 Bear)
- Treasury Fee: 0.12 ETH (3%)
- Net Pool: 3.88 ETH
- Winners (Bull): User1 + User3
  - User1: 3.88 × (1/2) = 1.94 ETH (0.94 ETH profit)
  - User3: 3.88 × (1/2) = 1.94 ETH (0.94 ETH profit)
- Loser (Bear): User2
  - Lost: 2 ETH
- Treasury: 0.12 ETH
```

---

## 🧪 Testing Flow

### Local Development
```bash
# 1. Deploy with mock oracles
npm run deploy:mocks

# 2. Check initial state
currentRound(BTC) → 1
currentRound(ETH) → 1
currentRound(BNB) → 1

# 3. Place bets
bet(BTC, Bull) with 1 ETH
bet(BTC, Bear) with 2 ETH

# 4. Wait 5 minutes (or skip time in tests)
lockRound(BTC, 1)

# 5. Wait 5 more minutes
closeRound(BTC, 1)

# 6. Claim rewards
claim(BTC, 1)

# 7. Create next round
createNextRound(BTC)
```

---

## 📚 Related Files

- [Prediction Market Flow](./PREDICTION_MARKET_FLOW.md) - User-facing flow
- [README.md](./README.md) - Setup and installation
- [contracts/MultiCoinPredictionMarket.sol](./contracts/MultiCoinPredictionMarket.sol) - Full contract code
- [contracts/MockPriceOracle.sol](./contracts/MockPriceOracle.sol) - Mock oracle for testing
- [scripts/automate-everything.js](./scripts/automate-everything.js) - Automation script
- [frontend/src/config/contract.ts](./frontend/src/config/contract.ts) - Contract ABI + address

---

## 🎓 Key Takeaways: Runtime Behavior

### What This Document Covered

1. **✅ Actual State Changes** - Not just "what the code does", but what storage slots get touched, what values change, and in what order

2. **✅ Interaction Flows** - Complete execution traces showing:
   - State reads (SLOAD operations)
   - State writes (SSTORE operations)
   - External calls (oracle, ETH transfers)
   - Validation checks and failure points
   - Event emissions

3. **✅ Edge Cases & Failures** - Real scenarios where transactions fail:
   - Race conditions (user vs automation)
   - Timing issues (bet after lock)
   - Economic edge cases (one-sided betting, ties)
   - Security concerns (oracle failure, insolvency)

4. **✅ Multi-User Scenarios** - How concurrent interactions work:
   - Simultaneous bets (safe)
   - Double-bet attempts (prevented)
   - Multiple claims (correct payout calculation)
   - Smart wallet interactions

5. **✅ Gas Economics** - Real costs and optimization:
   - First vs subsequent bets (cold vs warm storage)
   - Minimum viable bet amounts
   - Cost-benefit analysis for users

6. **✅ Complete Lifecycle** - Full round from creation to claims:
   - Every state transition
   - All ETH movements
   - Final accounting

### What Makes This Different

**Traditional docs say:**
> "The `bet()` function allows users to place bets with ETH."

**This doc shows:**
```
1. Frontend calls bet(BTC, Bull) with 1 ETH
2. Contract reads currentRound[BTC] → 50 (SLOAD: 2,100 gas)
3. Contract reads rounds[BTC][50] → validates Open status
4. Contract writes bets[BTC][50][user] (SSTORE: 20,000 gas)
5. Contract writes totalBullAmount += 1 ETH (SSTORE: 5,000 gas)
6. User's ETH transfers to contract
7. BetPlaced event emitted
8. Frontend refetches, UI updates
9. Total gas: ~100,000 (~$1.50 at 50 gwei)
```

### For Developers

**Use this doc to:**
- ✅ Understand exact gas costs before optimizing
- ✅ Debug transactions by tracing state changes
- ✅ Identify attack vectors and edge cases
- ✅ Design frontend with proper error handling
- ✅ Plan testing scenarios (normal + edge cases)

### For Auditors

**This doc provides:**
- ✅ Complete interaction matrix
- ✅ Failure scenarios (9+ edge cases)
- ✅ Reentrancy analysis
- ✅ Oracle dependency mapping
- ✅ Economic attack vectors (MEV, front-running)

### For Users

**Understand:**
- ✅ Why transactions fail (timing, already bet, not winner)
- ✅ Real costs (gas + bet amount)
- ✅ When to claim (immediately when round closes)
- ✅ Risk/reward (ROI calculations with gas)

---

**Last Updated:** 2026-01-31  
**Version:** 2.0.0 (Runtime Interaction Focus)  
**Lines:** 2,400+ (comprehensive runtime analysis)

