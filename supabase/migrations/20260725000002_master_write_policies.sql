-- ============================================
-- 마스터 데이터 쓰기 RLS 정책
-- 기존 정책 충돌 방지: DROP IF EXISTS 후 재생성
-- ============================================

DO $$ BEGIN
  -- 직원
  DROP POLICY IF EXISTS "authenticated_insert_employees" ON saehan_employees;
  DROP POLICY IF EXISTS "authenticated_update_employees" ON saehan_employees;
  DROP POLICY IF EXISTS "authenticated_delete_employees" ON saehan_employees;
  -- 설비
  DROP POLICY IF EXISTS "authenticated_insert_equipment" ON saehan_equipment;
  DROP POLICY IF EXISTS "authenticated_update_equipment" ON saehan_equipment;
  DROP POLICY IF EXISTS "authenticated_delete_equipment" ON saehan_equipment;
  -- 제품
  DROP POLICY IF EXISTS "authenticated_insert_products" ON saehan_products;
  DROP POLICY IF EXISTS "authenticated_update_products" ON saehan_products;
  DROP POLICY IF EXISTS "authenticated_delete_products" ON saehan_products;
END $$;

CREATE POLICY "authenticated_insert_employees" ON saehan_employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_employees" ON saehan_employees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_employees" ON saehan_employees FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_insert_equipment" ON saehan_equipment FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_equipment" ON saehan_equipment FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_equipment" ON saehan_equipment FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_insert_products" ON saehan_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_products" ON saehan_products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_products" ON saehan_products FOR DELETE TO authenticated USING (true);
