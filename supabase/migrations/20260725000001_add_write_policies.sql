-- ============================================
-- 쓰기 권한 RLS 정책 추가
-- 인증된 사용자에게 기본 쓰기 권한 부여
-- (추후 역할별 세분화 예정)
-- ============================================

-- 생산계획 CRUD
CREATE POLICY "authenticated_insert_plans" ON saehan_production_plans
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_plans" ON saehan_production_plans
  FOR UPDATE TO authenticated USING (true);

-- 생산계획 상세 CRUD
CREATE POLICY "authenticated_insert_details" ON saehan_production_plan_details
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_details" ON saehan_production_plan_details
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_details" ON saehan_production_plan_details
  FOR DELETE TO authenticated USING (true);

-- 인원산출 결과 CRUD
CREATE POLICY "authenticated_insert_calculations" ON saehan_staffing_calculations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_calculations" ON saehan_staffing_calculations
  FOR UPDATE TO authenticated USING (true);

-- 인력배치 CRUD
CREATE POLICY "authenticated_insert_assignments" ON saehan_worker_assignments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_assignments" ON saehan_worker_assignments
  FOR UPDATE TO authenticated USING (true);

-- 근무스케줄 수정
CREATE POLICY "authenticated_update_schedules" ON saehan_work_schedules
  FOR UPDATE TO authenticated USING (true);

-- 출결기록
CREATE POLICY "authenticated_insert_attendance" ON saehan_attendance_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- 변경이력
CREATE POLICY "authenticated_insert_changelogs" ON saehan_plan_change_logs
  FOR INSERT TO authenticated WITH CHECK (true);
