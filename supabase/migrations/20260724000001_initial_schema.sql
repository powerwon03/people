-- ============================================
-- 새한프라텍 생산 인력 자동 배치 시스템
-- 초기 스키마 마이그레이션
-- 모든 테이블명 saehan_ 접두사 사용
-- ============================================

-- 공장
CREATE TABLE saehan_factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 설비
CREATE TABLE saehan_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID NOT NULL REFERENCES saehan_factories(id),
  code TEXT NOT NULL UNIQUE,
  name TEXT,
  type TEXT,
  stage TEXT,
  air_usage_33k DECIMAL(5,2) DEFAULT 0,
  air_usage_25k DECIMAL(5,2) DEFAULT 0,
  air_usage_37k DECIMAL(5,2) DEFAULT 0,
  staffing_group TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saehan_equipment_factory ON saehan_equipment(factory_id);
CREATE INDEX idx_saehan_equipment_code ON saehan_equipment(code);

-- 제품
CREATE TABLE saehan_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  volume_ml INT,
  packaging_unit TEXT,
  packaging_unit_qty INT,
  daily_production_qty INT,
  daily_box_count DECIMAL(10,2),
  box_count_12h DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saehan_products_name ON saehan_products(name);

-- 직원
CREATE TABLE saehan_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  employee_no TEXT UNIQUE,
  department TEXT NOT NULL CHECK (department IN ('생산1팀PE', '생산1팀PET', '생산2팀')),
  shift_group TEXT NOT NULL CHECK (shift_group IN ('A', 'B', 'C')),
  role TEXT NOT NULL CHECK (role IN ('반장', 'OP', '운반포장', '검사원')),
  gender TEXT CHECK (gender IN ('M', 'F')),
  affiliation TEXT DEFAULT '새한' CHECK (affiliation IN ('새한', '세영', '다연', '피너')),
  locker_number TEXT,
  phone TEXT,
  status TEXT DEFAULT '재직' CHECK (status IN ('재직', '퇴사')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saehan_employees_department ON saehan_employees(department);
CREATE INDEX idx_saehan_employees_shift_group ON saehan_employees(shift_group);
CREATE INDEX idx_saehan_employees_status ON saehan_employees(status);

-- 인원산출 규칙
CREATE TABLE saehan_staffing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID NOT NULL REFERENCES saehan_factories(id),
  rule_code TEXT NOT NULL,
  equipment_codes TEXT[] NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('ALWAYS', 'PRODUCT_MATCH', 'SHIFT_MATCH', 'SET_OPERATION', 'COUNT_RANGE')),
  condition_value JSONB,
  required_headcount DECIMAL(3,1) NOT NULL,
  is_additional BOOLEAN DEFAULT false,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 포장박스 추가인원 규칙
CREATE TABLE saehan_packaging_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID NOT NULL REFERENCES saehan_factories(id),
  min_boxes INT NOT NULL,
  max_boxes INT,
  additional_headcount INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 트랜잭션 데이터
-- ============================================

-- 생산계획
CREATE TABLE saehan_production_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  revision INT DEFAULT 0,
  status TEXT DEFAULT '잠정' CHECK (status IN ('잠정', '확정')),
  created_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saehan_plans_week ON saehan_production_plans(week_start_date);
CREATE INDEX idx_saehan_plans_status ON saehan_production_plans(status);

-- 생산계획 상세
CREATE TABLE saehan_production_plan_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES saehan_production_plans(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES saehan_equipment(id),
  date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('주간', '야간')),
  product_id UUID REFERENCES saehan_products(id),
  status TEXT DEFAULT '가동' CHECK (status IN ('가동', '대기', '부동', '금형이상', '몰드체인지', 'confirm')),
  production_qty INT,
  packaging_box_qty TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, equipment_id, date, shift)
);

CREATE INDEX idx_saehan_plan_details_plan ON saehan_production_plan_details(plan_id);
CREATE INDEX idx_saehan_plan_details_date ON saehan_production_plan_details(date);

-- 근무 스케줄
CREATE TABLE saehan_work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES saehan_employees(id),
  date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('주', '야', '휴', '특근', '연차')),
  is_confirmed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

CREATE INDEX idx_saehan_schedules_date ON saehan_work_schedules(date);
CREATE INDEX idx_saehan_schedules_employee ON saehan_work_schedules(employee_id);

-- 인원 산출 결과
CREATE TABLE saehan_staffing_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES saehan_production_plans(id),
  date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('주간', '야간')),
  factory_id UUID NOT NULL REFERENCES saehan_factories(id),
  equipment_headcount JSONB,
  base_required DECIMAL(5,1),
  packaging_additional INT DEFAULT 0,
  total_required DECIMAL(5,1),
  available_count INT DEFAULT 0,
  gap INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, date, shift, factory_id)
);

-- 인력 배치
CREATE TABLE saehan_worker_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('주간', '야간')),
  department TEXT NOT NULL,
  role TEXT NOT NULL,
  sub_department TEXT,
  employee_id UUID NOT NULL REFERENCES saehan_employees(id),
  is_cross_assigned BOOLEAN DEFAULT false,
  cross_from TEXT,
  is_substitute BOOLEAN DEFAULT false,
  notes TEXT,
  status TEXT DEFAULT '자동배치' CHECK (status IN ('자동배치', '수정', '확정')),
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saehan_assignments_date_shift ON saehan_worker_assignments(date, shift);
CREATE INDEX idx_saehan_assignments_employee ON saehan_worker_assignments(employee_id);
CREATE INDEX idx_saehan_assignments_status ON saehan_worker_assignments(status);

-- 출결 기록
CREATE TABLE saehan_attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES saehan_employees(id),
  date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('주간', '야간')),
  status TEXT NOT NULL CHECK (status IN ('출근', '지각', '결근', '조퇴')),
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date, shift)
);

-- 계획 변경 이력
CREATE TABLE saehan_plan_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES saehan_production_plans(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL,
  affected_date DATE,
  affected_equipment_id UUID REFERENCES saehan_equipment(id),
  previous_value JSONB,
  new_value JSONB
);

-- 알림
CREATE TABLE saehan_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saehan_notifications_user ON saehan_notifications(user_id, is_read);

-- 사용자 프로필 (역할 매핑)
CREATE TABLE saehan_user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  employee_id UUID REFERENCES saehan_employees(id),
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'production_manager', 'support_manager', 'team_leader', 'shift_leader', 'worker')),
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RLS 정책
-- ============================================

ALTER TABLE saehan_factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_staffing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_packaging_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_production_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_production_plan_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_staffing_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_worker_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_plan_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saehan_user_profiles ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 마스터 데이터 읽기 가능
CREATE POLICY "authenticated_read_factories" ON saehan_factories FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_equipment" ON saehan_equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_products" ON saehan_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_employees" ON saehan_employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_rules" ON saehan_staffing_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_packaging" ON saehan_packaging_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_plans" ON saehan_production_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_details" ON saehan_production_plan_details FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_schedules" ON saehan_work_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_calculations" ON saehan_staffing_calculations FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_assignments" ON saehan_worker_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_attendance" ON saehan_attendance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_changelogs" ON saehan_plan_change_logs FOR SELECT TO authenticated USING (true);

-- 알림: 자기 것만 읽기
CREATE POLICY "users_read_own_notifications" ON saehan_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 사용자 프로필: 자기 것 읽기
CREATE POLICY "users_read_own_profile" ON saehan_user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 관리자 전체 쓰기 권한은 service_role로 처리 (Edge Functions에서)
