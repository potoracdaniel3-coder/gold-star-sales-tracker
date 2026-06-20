
ALTER TABLE public.bonuses
  ADD COLUMN IF NOT EXISTS metric text NOT NULL DEFAULT 'revenue',
  ADD COLUMN IF NOT EXISTS period text NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS threshold numeric,
  ADD COLUMN IF NOT EXISTS reward_type text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS reward_value text;

-- Backfill new columns from legacy data
UPDATE public.bonuses
SET threshold = COALESCE(threshold, weekly_revenue_threshold)
WHERE threshold IS NULL;

UPDATE public.bonuses
SET reward_value = COALESCE(reward_value, '$' || bonus_amount::text)
WHERE reward_value IS NULL;

ALTER TABLE public.bonuses
  ALTER COLUMN threshold SET NOT NULL,
  ALTER COLUMN reward_value SET NOT NULL,
  ALTER COLUMN weekly_revenue_threshold DROP NOT NULL,
  ALTER COLUMN bonus_amount DROP NOT NULL;

ALTER TABLE public.bonuses
  ADD CONSTRAINT bonuses_metric_check CHECK (metric IN ('revenue','jobs','doors','appts')),
  ADD CONSTRAINT bonuses_period_check CHECK (period IN ('weekly','monthly','lifetime')),
  ADD CONSTRAINT bonuses_reward_type_check CHECK (reward_type IN ('cash','prize','recognition','time_off'));
