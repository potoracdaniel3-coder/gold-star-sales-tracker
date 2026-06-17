
CREATE TABLE public.salespeople (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#d4af37',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salespeople TO anon, authenticated;
GRANT ALL ON public.salespeople TO service_role;
ALTER TABLE public.salespeople ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access" ON public.salespeople FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id UUID NOT NULL REFERENCES public.salespeople(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'other',
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  closed_at DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX jobs_salesperson_idx ON public.jobs(salesperson_id);
CREATE INDEX jobs_closed_at_idx ON public.jobs(closed_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO anon, authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access" ON public.jobs FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id UUID NOT NULL REFERENCES public.salespeople(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  doors_knocked INTEGER NOT NULL DEFAULT 0,
  appointments_set INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(salesperson_id, log_date)
);
CREATE INDEX activity_salesperson_idx ON public.activity_log(salesperson_id);
CREATE INDEX activity_date_idx ON public.activity_log(log_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO anon, authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access" ON public.activity_log FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.salespeople (name, color) VALUES
  ('Bob', '#d4af37'),
  ('Jim', '#9b8cff'),
  ('Dave', '#5ce1e6');
