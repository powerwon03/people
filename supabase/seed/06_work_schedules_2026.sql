-- ============================================
-- 3조 교대 근무 스케줄 2026년 연간 자동 생성
-- 기존 shift-pattern/generator.ts 로직과 동일
-- 12일 주기 패턴 기반
-- ============================================

-- 기존 스케줄 초기화
TRUNCATE saehan_work_schedules CASCADE;

-- 12일 주기 패턴 정의 (index 0~11)
-- A조: 야,휴,휴,주,주,주,주,휴,휴,야,야,야
-- B조: 휴,야,야,야,야,휴,휴,주,주,주,주,휴
-- C조: 주,주,주,주,휴,휴,야,야,야,야,휴,휴

WITH
-- 2026년 전체 날짜 생성
dates AS (
  SELECT d::date AS work_date,
         -- 2026-01-01 기준 오프셋 (mod 12)
         (EXTRACT(DOY FROM d::date) - 1)::int % 12 AS pattern_idx
  FROM generate_series('2026-01-01'::date, '2026-12-31'::date, '1 day'::interval) AS d
),
-- 12일 주기 패턴 테이블
patterns AS (
  SELECT * FROM (VALUES
    -- A조 패턴: 야야 휴휴 주주주주 휴휴 야야
    ('A', 0, '야'), ('A', 1, '야'), ('A', 2, '휴'), ('A', 3, '휴'),
    ('A', 4, '주'), ('A', 5, '주'), ('A', 6, '주'), ('A', 7, '주'),
    ('A', 8, '휴'), ('A', 9, '휴'), ('A', 10, '야'), ('A', 11, '야'),
    -- B조 패턴: 주주주주 휴휴 야야야야 휴휴
    ('B', 0, '주'), ('B', 1, '주'), ('B', 2, '주'), ('B', 3, '주'),
    ('B', 4, '휴'), ('B', 5, '휴'), ('B', 6, '야'), ('B', 7, '야'),
    ('B', 8, '야'), ('B', 9, '야'), ('B', 10, '휴'), ('B', 11, '휴'),
    -- C조 패턴: 휴휴 야야야야 휴휴 주주주주
    ('C', 0, '휴'), ('C', 1, '휴'), ('C', 2, '야'), ('C', 3, '야'),
    ('C', 4, '야'), ('C', 5, '야'), ('C', 6, '휴'), ('C', 7, '휴'),
    ('C', 8, '주'), ('C', 9, '주'), ('C', 10, '주'), ('C', 11, '주')
  ) AS t(shift_group, idx, shift_type)
)
INSERT INTO saehan_work_schedules (employee_id, date, shift_type, is_confirmed)
SELECT
  e.id,
  d.work_date,
  p.shift_type,
  true
FROM saehan_employees e
JOIN dates d ON true
JOIN patterns p ON p.shift_group = e.shift_group AND p.idx = d.pattern_idx
WHERE e.status = '재직'
ORDER BY e.id, d.work_date;
