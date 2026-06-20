## Goal
Layer proven gamification mechanics (points, tiers, badges, streaks, challenges, leaderboard perks) onto the existing salesman dashboard. Keep current XP/level math intact and build everything around it so nothing already working breaks.

## What gets added

### 1. Tiered ranks (Bronze → Platinum)
Derived from total approved revenue. Tiers are pure presentation — no new table needed.

| Tier | Threshold (all-time revenue) | Color |
|---|---|---|
| Bronze | $0 | #cd7f32 |
| Silver | $25,000 | #c0c0c0 |
| Gold | $75,000 | #d4af37 |
| Platinum | $200,000 | #5ce1e6 |
| Diamond | $500,000 | #9b8cff |

Shown as a badge on the profile card, on every leaderboard row, and as a progress bar "X to next tier" on the dashboard.

### 2. Badges / achievements
Computed client-side from existing data (jobs, activity, streaks). No DB writes — earned badges just render from facts. Initial set:

- **First Blood** — first approved job
- **Closer** — 10 approved jobs
- **Rainmaker** — 50 approved jobs
- **Big Ticket** — single job ≥ $10k
- **Hot Streak** — 3-week streak
- **On Fire** — 6-week streak
- **Door Crusher** — 500 lifetime doors knocked
- **Appointment King** — 100 lifetime appointments set
- **Top Dog** — currently #1 on all-time leaderboard
- **Tier badges** — Bronze/Silver/Gold/Platinum/Diamond (auto)

Rendered as a grid on the dashboard ("Achievements") with locked/unlocked states + tooltip showing how to earn. Earned badges also surface as small icons next to the name on the public leaderboard.

### 3. Daily streak + rotating daily challenge
Currently `computeStreak` is weekly. Add a parallel **daily streak** based on `activity_log` + approved jobs (any day with ≥1 door knocked, appt set, or approved job counts). Show flame icon + "X day streak — log activity today to keep it alive".

Daily challenge: one rotating challenge per day, deterministic from date so everyone sees the same one (e.g. "Knock 30 doors today", "Close 1 job today", "Set 3 appointments"). Progress bar fills from today's activity/jobs. Completion shows a checkmark + small XP bonus banner (visual only — does not write to DB).

### 4. Leaderboard perks
- **Crown** icon on rank #1
- Medal colors on top 3 (gold/silver/bronze)
- Tier badge + earned-achievement icons next to each name
- New **"This week"** toggle on the leaderboard dialog so users can switch between all-time and current-week views (weekly resets visually every Monday)

### 5. Cash bonus tiers (manager-approved)
Existing `bonuses` table already drives weekly revenue thresholds → cash payouts. Reuse it:
- `RewardsTrack` already shows progress to next bonus tier — keep it, restyle with tier colors and a "Claim" button once threshold is hit
- Clicking **Claim** opens a confirmation that submits a request (reuses existing approvals pipeline — a `pending` job-style record or a new lightweight `bonus_claim` flag). To keep scope tight: this plan reuses the existing manager **Approvals** queue by adding a `kind: 'bonus_claim'` notification rather than a new table. Manager sees it alongside job approvals and approves/rejects.

> Note: if you'd rather skip the claim button and have the manager just pay out automatically when the weekly threshold is hit, say so and I'll drop step 5's claim flow. Otherwise this is the minimum-DB-change path.

## Files touched

**New**
- `src/lib/gamification.ts` — pure functions: `tierFromRevenue`, `computeBadges`, `computeDailyStreak`, `dailyChallengeFor(date)`, `challengeProgress`
- `src/components/dashboard/TierBadge.tsx`
- `src/components/dashboard/AchievementsGrid.tsx`
- `src/components/dashboard/DailyChallenge.tsx`

**Edited**
- `src/routes/_authenticated/me.tsx` — add tier badge to profile card, insert AchievementsGrid and DailyChallenge sections, show daily streak alongside weekly streak
- `src/components/dashboard/Leaderboard.tsx` — crown, medal colors, tier badge, achievement icons, week/all-time toggle
- `src/components/dashboard/RewardsTrack.tsx` — restyle with tier colors + optional Claim button

**DB** — none required for the core mechanics. Step 5's Claim flow only needs a migration if you want it (one small table `bonus_claims` with manager approval policies). Confirm before I add it.

## Out of scope
- Real money/payouts logic (managers settle outside the app)
- Push notifications
- Virtual goods / avatar customization beyond existing color
