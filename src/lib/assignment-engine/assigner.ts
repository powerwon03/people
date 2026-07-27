import type {
  AssignmentInput,
  AssignmentResult,
  AssignmentSummary,
  AvailableEmployee,
  CrossAssignType,
  Department,
  DepartmentSummary,
  EmployeeAssignment,
} from '@/types';

/**
 * 부서별 가용 인원 그룹핑
 */
export function getAvailableByDepartment(
  employees: AvailableEmployee[],
): Record<string, AvailableEmployee[]> {
  const grouped: Record<string, AvailableEmployee[]> = {};
  for (const emp of employees) {
    if (!grouped[emp.department]) {
      grouped[emp.department] = [];
    }
    grouped[emp.department].push(emp);
  }
  return grouped;
}

/**
 * 과부족 계산: 양수=과잉, 음수=부족
 */
export function calculateGap(available: number, required: number): number {
  return available - required;
}

/**
 * 부서별 필요인원 산출 (인원산출 결과 기반)
 * 1공장 = 생산1팀PET + 생산1팀PE, 2공장 = 생산2팀
 */
function getDepartmentRequired(input: AssignmentInput): Record<Department, number> {
  const f1Total = input.staffing_result_factory1?.total_required ?? 0;
  const f2Total = input.staffing_result_factory2?.total_required ?? 0;

  // 1공장 인원을 PET:PE 비율로 분배 (실무 기준 약 80:20)
  const petRatio = 0.8;
  const petRequired = Math.round(f1Total * petRatio);
  const peRequired = f1Total - petRequired;

  return {
    '생산1팀PET': petRequired,
    '생산1팀PE': peRequired,
    '생산2팀': f2Total,
  };
}

/**
 * 역할 우선순위: 반장 > OP > 운반포장 > 검사원
 */
function rolePriority(role: string): number {
  switch (role) {
    case '반장': return 0;
    case 'OP': return 1;
    case '운반포장': return 2;
    case '검사원': return 3;
    default: return 4;
  }
}

/**
 * 직원을 배치 우선순위로 정렬 (반장 > OP > 운반포장 > 검사원, 새한 우선)
 */
function sortByPriority(employees: AvailableEmployee[]): AvailableEmployee[] {
  return [...employees].sort((a, b) => {
    const roleDiff = rolePriority(a.role) - rolePriority(b.role);
    if (roleDiff !== 0) return roleDiff;
    // 새한(정규직) 우선
    if (a.affiliation === '새한' && b.affiliation !== '새한') return -1;
    if (a.affiliation !== '새한' && b.affiliation === '새한') return 1;
    return 0;
  });
}

/**
 * 기본 배치: 각 부서에 소속 직원 배치
 */
function assignToDepartment(
  employees: AvailableEmployee[],
  department: Department,
  subDept: 'PE' | 'PET' | null,
): EmployeeAssignment[] {
  const sorted = sortByPriority(employees);
  return sorted.map((emp) => ({
    employee_id: emp.id,
    employee_name: emp.name,
    department: emp.department,
    role: emp.role,
    affiliation: emp.affiliation,
    assigned_department: department,
    assigned_sub_department: subDept,
    is_cross_assigned: false,
    cross_from: null,
  }));
}

/**
 * 크로스배치 타입 결정
 */
function determineCrossType(
  fromDept: Department,
  toDept: Department,
): CrossAssignType {
  if (fromDept === '생산1팀PET' && toDept === '생산1팀PE') return 'pet';
  if (fromDept === '생산1팀PE' && toDept === '생산1팀PET') return 'pe';
  if (fromDept === '생산2팀' && (toDept === '생산1팀PET' || toDept === '생산1팀PE')) return '2';
  if ((fromDept === '생산1팀PET' || fromDept === '생산1팀PE') && toDept === '생산2팀') return '1';
  return '대';
}


/**
 * 자동 배치 메인 함수
 * 인원산출 결과의 필요인원만큼만 배치하고, 부족 시 크로스배치
 */
export function assignEmployees(input: AssignmentInput): AssignmentResult {
  const grouped = getAvailableByDepartment(input.available_employees);
  const required = getDepartmentRequired(input);
  const allAssignments: EmployeeAssignment[] = [];

  const departments: { dept: Department; subDept: 'PE' | 'PET' | null }[] = [
    { dept: '생산1팀PET', subDept: 'PET' },
    { dept: '생산1팀PE', subDept: 'PE' },
    { dept: '생산2팀', subDept: null },
  ];

  // 각 부서에서 배치되지 않은 잔여 인원 추적
  const remainingByDept: Record<string, AvailableEmployee[]> = {};

  // 1단계: 각 부서에 필요인원만큼만 소속 직원 배치
  for (const { dept, subDept } of departments) {
    const available = sortByPriority(grouped[dept] ?? []);
    const need = required[dept];
    const toAssign = available.slice(0, need);
    const leftover = available.slice(need);

    allAssignments.push(...assignToDepartment(toAssign, dept, subDept));
    remainingByDept[dept] = leftover;
  }

  // 2단계: 부족 부서에 크로스배치 (다른 부서의 잔여 인원에서 충원)
  for (const { dept, subDept } of departments) {
    const assignedCount = allAssignments.filter((a) => a.assigned_department === dept).length;
    let deficit = required[dept] - assignedCount;
    if (deficit <= 0) continue;

    // 잔여 인원이 있는 다른 부서에서 충원 (같은 팀 우선: 1팀PE↔PET)
    const crossOrder = getCrossOrder(dept);
    for (const fromDept of crossOrder) {
      if (deficit <= 0) break;
      const candidates = remainingByDept[fromDept] ?? [];
      // 반장은 이동 불가, 역할 역순 (검사원부터 이동)
      const movable = [...candidates]
        .sort((a, b) => rolePriority(b.role) - rolePriority(a.role))
        .filter((e) => e.role !== '반장');

      const moveCount = Math.min(deficit, movable.length);
      for (let i = 0; i < moveCount; i++) {
        const emp = movable[i];
        allAssignments.push({
          employee_id: emp.id,
          employee_name: emp.name,
          department: emp.department,
          role: emp.role,
          affiliation: emp.affiliation,
          assigned_department: dept,
          assigned_sub_department: subDept,
          is_cross_assigned: true,
          cross_from: determineCrossType(emp.department, dept),
        });
        // 잔여 목록에서 제거
        remainingByDept[fromDept] = remainingByDept[fromDept].filter((e) => e.id !== emp.id);
        deficit--;
      }
    }
  }

  // 3단계: 요약 생성
  const summary = buildSummary(allAssignments, required);

  return {
    date: input.date,
    shift: input.shift,
    template: input.template,
    assignments: allAssignments,
    summary,
  };
}

/**
 * 크로스배치 충원 우선순위: 같은 팀(1팀 내) 우선, 그 다음 타 팀
 */
function getCrossOrder(targetDept: Department): Department[] {
  switch (targetDept) {
    case '생산1팀PET': return ['생산1팀PE', '생산2팀'];
    case '생산1팀PE': return ['생산1팀PET', '생산2팀'];
    case '생산2팀': return ['생산1팀PET', '생산1팀PE'];
  }
}

/**
 * 배치 요약 생성
 */
function buildSummary(
  assignments: EmployeeAssignment[],
  required: Record<Department, number>,
): AssignmentSummary {
  const departments: Department[] = ['생산1팀PET', '생산1팀PE', '생산2팀'];
  const byDepartment: Record<string, DepartmentSummary> = {};

  for (const dept of departments) {
    const assignedToDept = assignments.filter((a) => a.assigned_department === dept);
    const crossIn = assignedToDept.filter((a) => a.is_cross_assigned).length;
    const crossOut = assignments.filter(
      (a) => a.department === dept && a.is_cross_assigned && a.assigned_department !== dept,
    ).length;

    byDepartment[dept] = {
      required: required[dept],
      assigned: assignedToDept.length,
      gap: assignedToDept.length - required[dept],
      cross_in: crossIn,
      cross_out: crossOut,
    };
  }

  return {
    total_assigned: assignments.length,
    by_department: byDepartment,
  };
}
