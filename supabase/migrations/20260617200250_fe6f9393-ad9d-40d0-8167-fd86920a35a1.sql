
DROP POLICY IF EXISTS "open access" ON public.salespeople;
DROP POLICY IF EXISTS "open access" ON public.jobs;
DROP POLICY IF EXISTS "open access" ON public.activity_log;

REVOKE ALL ON public.salespeople FROM anon;
REVOKE ALL ON public.jobs FROM anon;
REVOKE ALL ON public.activity_log FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salespeople TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.salespeople TO service_role;
GRANT ALL ON public.jobs TO service_role;
GRANT ALL ON public.activity_log TO service_role;

CREATE POLICY "Authenticated users can view salespeople"
  ON public.salespeople FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert salespeople"
  ON public.salespeople FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update salespeople"
  ON public.salespeople FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete salespeople"
  ON public.salespeople FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view jobs"
  ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert jobs"
  ON public.jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update jobs"
  ON public.jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete jobs"
  ON public.jobs FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view activity"
  ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert activity"
  ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update activity"
  ON public.activity_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete activity"
  ON public.activity_log FOR DELETE TO authenticated USING (true);
