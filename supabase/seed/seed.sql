-- ============================================
-- 시드 데이터 통합 실행 파일
-- 순서대로 실행 (FK 의존성 순서 보장)
-- Usage: psql 또는 Supabase SQL Editor에서 실행
-- ============================================

-- 기존 데이터 초기화 (개발용)
TRUNCATE saehan_plan_change_logs CASCADE;
TRUNCATE saehan_attendance_logs CASCADE;
TRUNCATE saehan_worker_assignments CASCADE;
TRUNCATE saehan_staffing_calculations CASCADE;
TRUNCATE saehan_work_schedules CASCADE;
TRUNCATE saehan_production_plan_details CASCADE;
TRUNCATE saehan_production_plans CASCADE;
TRUNCATE saehan_packaging_rules CASCADE;
TRUNCATE saehan_staffing_rules CASCADE;
TRUNCATE saehan_employees CASCADE;
TRUNCATE saehan_products CASCADE;
TRUNCATE saehan_equipment CASCADE;
TRUNCATE saehan_factories CASCADE;

\i 01_factories.sql
\i 02_equipment.sql
\i 03_staffing_rules.sql
\i 04_employees.sql
\i 05_products_sample.sql
