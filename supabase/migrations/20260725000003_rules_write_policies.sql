-- 인원산출 규칙 쓰기 RLS 정책
DO $$ BEGIN
  DROP POLICY IF EXISTS "authenticated_insert_rules" ON saehan_staffing_rules;
  DROP POLICY IF EXISTS "authenticated_update_rules" ON saehan_staffing_rules;
  DROP POLICY IF EXISTS "authenticated_delete_rules" ON saehan_staffing_rules;
  DROP POLICY IF EXISTS "authenticated_insert_packaging" ON saehan_packaging_rules;
  DROP POLICY IF EXISTS "authenticated_update_packaging" ON saehan_packaging_rules;
  DROP POLICY IF EXISTS "authenticated_delete_packaging" ON saehan_packaging_rules;
END $$;

CREATE POLICY "authenticated_insert_rules" ON saehan_staffing_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_rules" ON saehan_staffing_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_rules" ON saehan_staffing_rules FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_insert_packaging" ON saehan_packaging_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_packaging" ON saehan_packaging_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_packaging" ON saehan_packaging_rules FOR DELETE TO authenticated USING (true);
