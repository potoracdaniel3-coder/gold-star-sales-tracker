
# Two-Interface Sales Platform

## Roles
- **Manager** (`potoracdaniel3@gmail.com`, `joshuaburketbusiness@gmail.com`): sees current dashboard + new **Approvals** tab + **Bonuses** tab + chatbot.
- **Salesman** (everyone else): sees the new gamified salesman dashboard. Linked to a salesperson record by `user_id`.

## Sign-up flow
- Auth page adds a **Display name** field on sign-up.
- Trigger on new user: if email is in manager list → role `manager`; else role `viewer`, AND auto-create a row in `salespeople` linked by new `user_id` column using the typed name.

## Database changes
- `salespeople`: add `user_id uuid` (nullable, unique) referencing `auth.users`.
- `jobs`: add `status text` (`pending` | `approved` | `rejected`, default `pending`), `submitted_by uuid`, `reviewed_at`, `reviewer_id`, `reject_reason`.
- New `goals` table: `salesperson_id`, `goal_type` (`weekly_revenue` | `weekly_jobs` | `weekly_activity` | `lifetime_revenue`), `target numeric`, `period_start date` (null for lifetime), `created_at`.
- New `bonuses` table (manager-set, applies to all): `label`, `weekly_revenue_threshold numeric`, `bonus_amount numeric`, `active bool`.
- RLS:
  - Viewers can insert their own jobs as `pending` only. Approved/rejected updates manager-only.
  - Leaderboard/stats queries filter `status = 'approved'`.
  - Goals: salesman manages own; manager reads all.
  - Bonuses: manager writes, all signed-in read.

## Manager dashboard (additions)
- **Approvals tab**: list of pending jobs (who, $, type, description, date) with Approve / Reject (+ reason). Badge on tab with pending count.
- **Bonuses tab**: CRUD list of weekly revenue thresholds + bonus payouts.
- Chatbot stays. Existing leaderboard/progress/history continue to work (now filtered to approved jobs).

## Salesman dashboard (new route `/_authenticated/me`)
Layout inspired by the profile screenshot (clean profile header + stat cards + sections), keeping the existing dark gold theme.

Sections:
1. **Profile header**: avatar (initial circle in their color), name, **Rank X of N**, XP-to-next-level progress bar.
2. **Stat cards**: Top Streak (🔥 consecutive weeks with ≥1 approved job), XP Points ($1 = 1 XP), Level.
3. **My Analytics**: close rate (approved jobs / (approved + rejected)), average revenue/job, weeks worked (distinct weeks with activity), this-week revenue.
4. **My Goals**: cards with progress bars for each goal type. "+ Add goal" dialog supporting weekly revenue, weekly jobs, weekly doors/appts, long-term revenue.
5. **Rewards path** (gamification, Brawl-Stars-style horizontal track): manager-set bonus tiers as cards along a track with checkmarks for tiers the salesman's current-week revenue has unlocked, and a "X to next reward" indicator.
6. **Submit job** button → dialog (amount, type, description, date) → inserts `status='pending'`. Shows "Pending review" toast.
7. **My submissions** list with pending/approved/rejected badges.
8. **All-time leaderboard** button → opens a dialog/tab with the full leaderboard so they can see where they rank.

## Routing
- `/_authenticated/` (index): manager sees current dashboard; salesman gets redirected to `/_authenticated/me`.
- `/_authenticated/me`: salesman dashboard (managers can also visit to preview).

## Technical details
- All XP / level / streak / rank derivation happens client-side from approved jobs (no extra columns needed). Level = `floor(xp/10000)+1`, progress = `xp % 10000`.
- Submissions hidden from leaderboard until approved. Rejected jobs never count.
- Chatbot tools updated: `list_pending_jobs`, `approve_job`, `reject_job`, `set_bonus`.
- Reuse existing `AddJobDialog` shape for the salesman submit flow but force `status='pending'` and `salesperson_id = current user's salesperson`.

## Out of scope (confirm if wanted later)
- Receipt image uploads (storage bucket) — not included; ask later if needed.
- Push/email notifications on approval — not included.
- Per-salesman custom bonuses — bonuses are global tiers set by manager.
