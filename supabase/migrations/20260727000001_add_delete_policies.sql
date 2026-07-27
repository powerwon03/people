-- 인력배치 DELETE 정책 추가 (재배치 시 기존 데이터 삭제 필요)
CREATE POLICY "authenticated_delete_assignments" ON saehan_worker_assignments
  FOR DELETE TO authenticated USING (true);

-- 인원산출 DELETE 정책 추가 (재산출 시 기존 데이터 삭제 필요)
CREATE POLICY "authenticated_delete_calculations" ON saehan_staffing_calculations
  FOR DELETE TO authenticated USING (true);

-- 생산계획 상세 DELETE 정책 추가 (계획 수정 시 기존 상세 삭제 필요)
CREATE POLICY "authenticated_delete_plan_details" ON saehan_production_plan_details
  FOR DELETE TO authenticated USING (true);
