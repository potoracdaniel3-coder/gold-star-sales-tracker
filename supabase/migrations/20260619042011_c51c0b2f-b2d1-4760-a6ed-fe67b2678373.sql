
-- 1) salespeople: add user_id link
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) jobs: approval workflow
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason text;

-- Existing jobs (created by managers before this migration) should be approved
UPDATE public.jobs SET status = 'approved' WHERE status = 'pending' AND submitted_by IS NULL;

-- Constrain status values
DO $$ BEGIN
  ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id uuid NOT NULL REFERENCES public.salespeople(id) ON DELETE CASCADE,
  goal_type text NOT NULL CHECK (goal_type IN ('weekly_revenue','weekly_jobs','weekly_doors','weekly_appts','lifetime_revenue')),
  target numeric NOT NULL CHECK (target > 0),
  period_start date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or manager all goals" ON public.goals FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'manager')
  OR salesperson_id IN (SELECT id FROM public.salespeople WHERE user_id = auth.uid())
);
CREATE POLICY "Insert own goals" ON public.goals FOR INSERT TO authenticated
WITH CHECK (
  salesperson_id IN (SELECT id FROM public.salespeople WHERE user_id = auth.uid())
);
CREATE POLICY "Update own goals" ON public.goals FOR UPDATE TO authenticated
USING (salesperson_id IN (SELECT id FROM public.salespeople WHERE user_id = auth.uid()))
WITH CHECK (salesperson_id IN (SELECT id FROM public.salespeople WHERE user_id = auth.uid()));
CREATE POLICY "Delete own goals" ON public.goals FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'manager')
  OR salesperson_id IN (SELECT id FROM public.salespeople WHERE user_id = auth.uid())
);

-- 4) bonuses table
CREATE TABLE IF NOT EXISTS public.bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  weekly_revenue_threshold numeric NOT NULL CHECK (weekly_revenue_threshold > 0),
  bonus_amount numeric NOT NULL CHECK (bonus_amount >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bonuses TO authenticated;
GRANT ALL ON public.bonuses TO service_role;
ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view bonuses" ON public.bonuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage bonuses insert" ON public.bonuses FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers manage bonuses update" ON public.bonuses FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers manage bonuses delete" ON public.bonuses FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- 5) Update jobs RLS for approval workflow
DROP POLICY IF EXISTS "Anyone signed in can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone signed in can insert jobs" ON public.jobs;

CREATE POLICY "View approved or own jobs" ON public.jobs FOR SELECT TO authenticated
USING (
  status = 'approved'
  OR public.has_role(auth.uid(), 'manager')
  OR submitted_by = auth.uid()
  OR salesperson_id IN (SELECT id FROM public.salespeople WHERE user_id = auth.uid())
);

CREATE POLICY "Managers insert jobs" ON public.jobs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Salesman submits own pending jobs" ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  status = 'pending'
  AND submitted_by = auth.uid()
  AND salesperson_id IN (SELECT id FROM public.salespeople WHERE user_id = auth.uid())
);

-- 6) Allow salesmen to update their own salesperson row name/color
DROP POLICY IF EXISTS "Salesman updates own row" ON public.salespeople;
CREATE POLICY "Salesman updates own row" ON public.salespeople FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 7) Updated signup trigger: assigns role AND auto-creates salesperson with display_name
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  manager_emails text[] := array['potoracdaniel3@gmail.com', 'joshuaburketbusiness@gmail.com'];
  display_name text;
  palette text[] := array['#d4af37','#9b8cff','#5ce1e6','#f97373','#7ee29c','#f7b955','#c084fc'];
  pick text;
begin
  if lower(new.email) = any(manager_emails) then
    insert into public.user_roles (user_id, role) values (new.id, 'manager')
    on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'viewer')
    on conflict do nothing;

    display_name := coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''), split_part(new.email,'@',1));
    pick := palette[1 + floor(random()*array_length(palette,1))::int];

    insert into public.salespeople (user_id, name, color)
    values (new.id, display_name, pick)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$function$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
