# Product Requirements Document: P2P "Chess Coin" Betting

**Version:** 1.0
**Date:** 2025-06-25
**Author:** Cline (AI Product Manager)
**Status:** Drafting

---

## 1. Introduction & Vision

### 1.1. Problem Statement
Our core user base of adult chess learners is motivated by progress and measurable achievement. While our current feature set provides excellent learning tools, it lacks a strong, persistent engagement loop that makes every action within the app feel rewarding. There is an opportunity to increase user motivation and session length by introducing a competitive, low-stakes system that rewards both learning and playing.

### 1.2. Vision
To create a fun, safe, and motivating in-app economy where users can earn and stake "Chess Coins" on their games. This system will transform every match into a more meaningful challenge and directly reward users for engaging with our core educational features, fostering a virtuous cycle of learning and competition.

### 1.3. Target Audience
Adult chess learners (primary) and intermediate players who are motivated by clear goals, tangible progression, and friendly competition.

---

## 2. Key Goals & Success Metrics

### 2.1. Goals
- **Primary Goal:** Increase user engagement, measured by session length, frequency, and the number of games played per user.
- **Secondary Goal:** Drive deeper adoption of core learning features (Lessons, Workouts) by positioning them as the primary source for earning Chess Coins.
- **Tertiary Goal:** Establish a foundational in-app economy that can be expanded later with cosmetic items or other premium features.

### 2.2. Success Metrics
- **Engagement:**
    - Daily Active Users (DAU) increases by 15% within 3 months of launch.
    - Average number of games played per user per week increases by 25%.
- **Feature Adoption:**
    - 70% of DAU play at least one staked match per week.
    - A 20% increase in the completion rate of Lessons and Daily Workouts.
- **Economic Health:**
    - Total volume of coins staked daily.
    - A stable or growing average coin balance per user.

---

## 3. Core User Stories

| ID | User Story | Priority |
|----|------------|----------|
| CC-01 | As a new user, I want to receive a starting balance of Chess Coins so I can immediately try the betting feature. | Must-Have |
| CC-02 | As a user, I want to earn Chess Coins by completing lessons so my learning efforts feel rewarded. | Must-Have |
| CC-03 | As a user, I want to earn Chess Coins by finishing my daily workout so I am motivated to train consistently. | Must-Have |
| CC-04 | As a user, I want to challenge another player to a live game and propose a stake of Chess Coins. | Must-Have |
| CC-05 | As a user, I want to see my coin balance clearly and view a simple history of my recent transactions. | Must-Have |
| CC-06 | As a user, when a staked match begins, I want assurance that the coins are held securely in escrow. | Must-Have |
| CC-07 | As a user, I want my winnings (or returned stake in a draw) to be credited to my balance instantly after a match. | Must-Have |
| CC-08 | As a user, I want to receive a small daily login bonus of coins to encourage me to return to the app. | Should-Have |
| CC-09 | As a user, I want to be able to spend my coins on cosmetic items like unique board themes or profile badges. | Could-Have (Future) |

---

## 4. Detailed User Flow & Functional Requirements

### 4.1. The Virtual Economy: Earning & Management

#### 4.1.1. Coin Generation (The "Mint")
- **New User Grant:**
    - **Trigger:** Upon successful user registration and first login.
    - **Action:** Credit the user's account with 500 Chess Coins.
    - **Technical:** This should be part of the `on_user_created` hook in the authentication flow.
- **Earning Through Activities:**
    - **Daily Login:** +50 Coins. (Resets every 24 hours).
    - **Lesson Completion:** +100 Coins per lesson.
    - **Daily Workout Completion:** +150 Coins.
    - **Winning a standard (non-staked) game:** +25 Coins.

#### 4.1.2. Wallet & History
- A `Wallet` component will be added to the user's main dashboard UI.
- It must display the current `coin_balance`.
- It must include a "Transaction History" tab or modal that shows the last 20 transactions, including:
    - `Amount` (e.g., +100, -50)
    - `Description` (e.g., "Lesson Complete: The Italian Game", "Match Stake vs. playerX")
    - `Timestamp`

### 4.2. The Betting Flow

#### 4.2.1. Matchmaking & Staking
- The "Live Play" matchmaking UI will be updated to include a "Stake" input field.
- Users can enter a coin amount or select from presets (e.g., 50, 100, 250).
- When a challenge is sent, the stake amount is included in the challenge data.

#### 4.2.2. Escrow & Payout
- **On Match Accept:**
    1. The system verifies both players have sufficient `coin_balance`.
    2. If funds are sufficient, the stake amount is debited from both players' balances.
    3. The total pot is held in a temporary state by the system (e.g., associated with the `live_game` record).
- **On Match End:**
    1. **Win/Loss:** The winner is credited with the full pot amount.
    2. **Draw:** Both players are credited back their original stake.
    3. **Abandonment:** The player who abandons the game forfeits their stake. The other player is credited with the full pot. A grace period for disconnection (e.g., 60 seconds) should be implemented.
    4. A `coin_transaction` record is created for each debit/credit.

---

## 5. Technical Implementation Plan

### 5.1. Database Schema Changes
- **`users` table:**
    - Add `coin_balance` (Integer, `default: 500`, `nullable: false`).
- **New `coin_transactions` table:**
    - `id` (Primary Key)
    - `user_id` (Foreign Key to `users.id`)
    - `amount` (Integer, can be positive or negative)
    - `description` (String, e.g., "Match Win vs. playerX")
    - `created_at` (Timestamp)
    - `related_entity_id` (e.g., `game_id`, `lesson_id`) (Optional, for analytics)

### 5.2. Backend Implementation (FastAPI)
- **`CoinService` (`/core/coins.py`):**
    - A new centralized service to handle all coin logic.
    - `get_balance(user_id)`
    - `credit(user_id, amount, description)`
    - `debit(user_id, amount, description)`
    - All functions must be atomic and handle transactions safely.
- **API Endpoint Updates:**
    - Modify `live.py` to handle the staking, escrow, and payout logic by calling the `CoinService`.
    - Modify `lessons.py` and `workout.py` to credit users upon completion.

### 5.3. Out of Scope for this Phase
- Real-money transactions (deposits/withdrawals).
- Purchasing Chess Coins with real money.
- A "store" for spending coins on cosmetic items.
- A platform "rake" or fee on staked matches.

---

## 6. Open Questions
1. What should be the exact coin rewards for each activity? (Initial values are placeholders).
2. What should the betting limits be, if any, for new users?
