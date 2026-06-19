## Goal
Make it easy to test the salesman dashboard right now by enabling auto-confirm email, and capture the future requirement that managers must confirm their email while salespeople do not.

## Steps

1. **Enable auto-confirm email (now, for testing)**
   - Turn on auto-confirm so any new signup is instantly logged in.
   - This lets you create a non-manager test account and immediately land on `/me`.

2. **Document the testing flow** (no code, just so you know what to do once auto-confirm is on)
   - Sign out of your manager account.
   - Go to `/auth` → "Need an account? Sign up".
   - Use any email that is NOT `potoracdaniel3@gmail.com` or `joshuaburketbusiness@gmail.com` (e.g. `tester+1@example.com`).
   - Enter a display name and a password (8+ chars).
   - You'll be redirected to `/` and then auto-bounced to `/me` (the salesman dashboard).
   - From `/me` you can: see XP/level/streak/rank, submit a job (pending), set goals, view the reward track, and open the all-time leaderboard.
   - To test approval flow end-to-end: submit a job as the salesman, sign back in as the manager, open the **Approvals** tab, and approve it. The job then appears in XP, leaderboard, and rewards.

3. **Future work (not done now — noted for later)**
   - Add a manager-only email-confirmation requirement: salespeople auto-confirm, managers must click the email link before they can sign in.
   - Implementation sketch for later: keep global auto-confirm OFF, then on signup auto-confirm only non-manager emails (via a safe server-side path), and rely on the standard email-confirmation flow for the two hardcoded manager emails. This will also require setting up the auth email templates / sender domain so the confirmation email is actually delivered with your branding.

## Out of scope
- Email template branding / custom sender domain (only needed when we switch to manager-only confirmation).
- Any UI changes to the salesman dashboard.
- Any changes to roles, RLS, or the chatbot.

## Technical detail
- Single backend change: set `auto_confirm_email = true` on the project's auth config. No migrations, no code edits.
