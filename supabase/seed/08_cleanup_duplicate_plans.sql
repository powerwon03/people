-- 중복 생산계획 정리: 같은 주에 여러 계획이 있으면 최신 1개만 남기고 삭제
-- (CASCADE로 상세 데이터도 함께 삭제됨)

DELETE FROM saehan_production_plans
WHERE id NOT IN (
  SELECT DISTINCT ON (week_start_date) id
  FROM saehan_production_plans
  ORDER BY week_start_date, created_at DESC
);
