// ============================================
// 마스터 데이터 타입
// ============================================

export type Factory = {
  id: string;
  name: string; // '1공장', '2공장', '음성공장'
  location: string; // '청주', '음성'
  created_at: string;
};

export type Equipment = {
  id: string;
  factory_id: string;
  code: string; // '01', '02', 'S1', 'E1', 'P1'
  name: string | null; // 'AOKI 1000H-60'
  type: string | null; // 'PET성형', '2STAGE', 'PE성형', '캡'
  stage: string | null; // '1STAGE', '2STAGE', 'PE', 'PET', '캡'
  air_usage_33k: number;
  air_usage_25k: number;
  air_usage_37k: number;
  staffing_group: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type Product = {
  id: string;
  name: string; // '대상 쌈장 450ML'
  volume_ml: number | null;
  packaging_unit: string | null; // '박스', '파렛트', '필름'
  packaging_unit_qty: number | null;
  daily_production_qty: number | null;
  daily_box_count: number | null;
  box_count_12h: number | null; // 핵심: 인원산출 기준
  created_at: string;
};

export type Employee = {
  id: string;
  name: string;
  employee_no: string | null;
  department: Department;
  shift_group: ShiftGroup;
  role: EmployeeRole;
  gender: 'M' | 'F';
  affiliation: Affiliation;
  locker_number: string | null;
  phone: string | null;
  status: '재직' | '퇴사';
  created_at: string;
};

export type Department = '생산1팀PE' | '생산1팀PET' | '생산2팀';
export type ShiftGroup = 'A' | 'B' | 'C';
export type EmployeeRole = '반장' | 'OP' | '운반포장' | '검사원';
export type Affiliation = '새한' | '세영' | '다연' | '피너';
export type Shift = '주간' | '야간';
export type ShiftType = '주' | '야' | '휴' | '특근' | '연차';

// ============================================
// 인원산출 규칙 타입
// ============================================

export type ConditionType =
  | 'ALWAYS' // 가동 시 항상
  | 'PRODUCT_MATCH' // 특정 제품 생산 시
  | 'SHIFT_MATCH' // 특정 교대 시
  | 'SET_OPERATION' // 세트 운영 (08,09 / E1,E2 등)
  | 'COUNT_RANGE'; // 가동 대수 범위

export type StaffingRule = {
  id: string;
  factory_id: string;
  rule_code: string;
  equipment_codes: string[];
  condition_type: ConditionType;
  condition_value: Record<string, unknown> | null;
  required_headcount: number;
  is_additional: boolean;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type PackagingRule = {
  id: string;
  factory_id: string;
  min_boxes: number;
  max_boxes: number | null;
  additional_headcount: number;
  created_at: string;
};

// ============================================
// 트랜잭션 데이터 타입
// ============================================

export type ProductionPlan = {
  id: string;
  week_start_date: string;
  revision: number;
  status: '잠정' | '확정';
  created_by: string | null;
  confirmed_at: string | null;
  created_at: string;
};

export type EquipmentStatus =
  | '가동'
  | '대기'
  | '부동'
  | '금형이상'
  | '몰드체인지'
  | 'confirm';

export type ProductionPlanDetail = {
  id: string;
  plan_id: string;
  equipment_id: string;
  date: string;
  shift: Shift;
  product_id: string | null;
  status: EquipmentStatus;
  production_qty: number | null;
  packaging_box_qty: string | null;
  notes: string | null;
  created_at: string;
};

export type WorkSchedule = {
  id: string;
  employee_id: string;
  date: string;
  shift_type: ShiftType;
  is_confirmed: boolean;
  created_at: string;
};

export type StaffingCalculation = {
  id: string;
  plan_id: string;
  date: string;
  shift: Shift;
  factory_id: string;
  equipment_headcount: Record<string, number>;
  base_required: number;
  packaging_additional: number;
  total_required: number;
  available_count: number;
  gap: number;
  created_at: string;
};

export type AssignmentStatus = '자동배치' | '수정' | '확정';

export type WorkerAssignment = {
  id: string;
  date: string;
  shift: Shift;
  department: Department;
  role: string; // 'BOX&운반', '품질검사'
  sub_department: string | null; // 'PE', 'PET'
  employee_id: string;
  is_cross_assigned: boolean;
  cross_from: string | null;
  is_substitute: boolean;
  notes: string | null;
  status: AssignmentStatus;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
};

// ============================================
// 인원산출 엔진 입출력 타입
// ============================================

export type EquipmentOperation = {
  equipment_code: string;
  is_operating: boolean;
  product_name: string | null;
  product_id: string | null;
  box_count_12h: number | null;
};

export type StaffingInput = {
  date: string;
  shift: Shift;
  factory_id: string;
  operations: EquipmentOperation[];
};

export type StaffingResult = {
  date: string;
  shift: Shift;
  factory_id: string;
  equipment_details: Record<string, number>; // 설비코드 -> 필요인원
  base_required: number;
  packaging_additional: number;
  combination_additional: number; // 2공장 조합 추가인원
  total_required: number;
};

// ============================================
// UI 관련 타입
// ============================================

export type UserRole =
  | 'admin'
  | 'production_manager'
  | 'support_manager'
  | 'team_leader'
  | 'shift_leader'
  | 'worker';

export type UserProfile = {
  id: string;
  employee_id: string | null;
  role: UserRole;
  permissions: string[];
  created_at: string;
};

export type AssignmentTemplate = '평일' | '주말' | '월요일';

// ============================================
// 자동 배치 엔진 타입
// ============================================

export type CrossAssignType = 'pe' | 'pet' | '2' | '1' | '대' | null;

export type AssignmentSlot = {
  department: Department;
  role: EmployeeRole;
  sub_department: 'PE' | 'PET' | null; // 생산1팀 내 PE/PET 구분
  required_count: number;
};

export type EmployeeAssignment = {
  employee_id: string;
  employee_name: string;
  department: Department;
  role: EmployeeRole;
  affiliation: Affiliation;
  assigned_department: Department;
  assigned_sub_department: 'PE' | 'PET' | null;
  is_cross_assigned: boolean;
  cross_from: CrossAssignType;
};

export type AssignmentInput = {
  date: string;
  shift: Shift;
  template: AssignmentTemplate;
  staffing_result_factory1: StaffingResult | null;
  staffing_result_factory2: StaffingResult | null;
  available_employees: AvailableEmployee[];
};

export type AvailableEmployee = {
  id: string;
  name: string;
  department: Department;
  role: EmployeeRole;
  gender: 'M' | 'F';
  affiliation: Affiliation;
  shift_group: ShiftGroup;
};

export type AssignmentResult = {
  date: string;
  shift: Shift;
  template: AssignmentTemplate;
  assignments: EmployeeAssignment[];
  summary: AssignmentSummary;
};

export type AssignmentSummary = {
  total_assigned: number;
  by_department: Record<string, DepartmentSummary>;
};

export type DepartmentSummary = {
  required: number;
  assigned: number;
  gap: number; // 양수=과잉, 음수=부족
  cross_in: number; // 타 부서에서 온 인원
  cross_out: number; // 타 부서로 간 인원
};
