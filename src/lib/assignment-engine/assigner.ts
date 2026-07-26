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
 * 크로스배치 제안: 과잉 부서에서 부족 부서로 인원 이동 제안
 */
export function suggestCrossAssignments(
  gaps: Record<string, number>,
  employees: AvailableEmployee[],
): EmployeeAssignment[] {
  const suggestions: EmployeeAssignment[] = [];
  const grouped = getAvailableByDepartment(employees);

  // 부족 부서 찾기
  const deficitDepts = Object.entries(gaps)
    .filter(([, gap]) => gap < 0)
    .sort(([, a], [, b]) => a - b); // 가장 부족한 부서 우선

  // 과잉 부서 찾기
  const surplusDepts = Object.entries(gaps)
    .filter(([, gap]) => gap > 0)
    .sort(([, a], [, b]) => b - a); // 가장 과잉인 부서 우선

  if (deficitDepts.length === 0 || surplusDepts.length === 0) {
    return [];
  }

  // 과잉 부서에서 부족 부서로 인원 이동 제안
  const remainingSurplus: Record<string, number> = {};
  surplusDepts.forEach(([dept, gap]) => { remainingSurplus[dept] = gap; });

  for (const [deficitDept, deficitGap] of deficitDepts) {
    let needed = Math.abs(deficitGap);

    for (const [surplusDept] of surplusDepts) {
      if (needed <= 0 || (remainingSurplus[surplusDept] ?? 0) <= 0) continue;

      const available = grouped[surplusDept] ?? [];
      // 검사원부터 이동 (역할 역순 - 핵심 인력은 유지)
      const candidates = [...available]
        .sort((a, b) => rolePriority(b.role) - rolePriority(a.role))
        .filter((e) => e.role !== '반장'); // 반장은 이동 불가

      const moveCount = Math.min(needed, remainingSurplus[surplusDept] ?? 0);

      for (let i = 0; i < moveCount && i < candidates.length; i++) {
        const emp = candidates[i];
        suggestions.push({
          employee_id: emp.id,
          employee_name: emp.name,
          department: emp.department,
          role: emp.role,
          affiliation: emp.affiliation,
          assigned_department: deficitDept as Department,
          assigned_sub_department: deficitDept === '생산1팀PE' ? 'PE'
            : deficitDept === '생산1팀PET' ? 'PET'
            : null,
          is_cross_assigned: true,
          cross_from: determineCrossType(emp.department, deficitDept as Department),
        });
        needed--;
        remainingSurplus[surplusDept] = (remainingSurplus[surplusDept] ?? 0) - 1;
      }
    }
  }

  return suggestions;
}

/**
 * 자동 배치 메인 함수
 */
export function assignEmployees(input: AssignmentInput): AssignmentResult {
  const grouped = getAvailableByDepartment(input.available_employees);
  const required = getDepartmentRequired(input);
  const allAssignments: EmployeeAssignment[] = [];

  // 1단계: 각 부서에 소속 직원 기본 배치
  const petEmployees = grouped['생산1팀PET'] ?? [];
  const peEmployees = grouped['생산1팀PE'] ?? [];
  const team2Employees = grouped['생산2팀'] ?? [];

  allAssignments.push(...assignToDepartment(petEmployees, '생산1팀PET', 'PET'));
  allAssignments.push(...assignToDepartment(peEmployees, '생산1팀PE', 'PE'));
  allAssignments.push(...assignToDepartment(team2Employees, '생산2팀', null));

  // 2단계: 과부족 계산
  const gaps: Record<string, number> = {
    '생산1팀PET': calculateGap(petEmployees.length, required['생산1팀PET']),
    '생산1팀PE': calculateGap(peEmployees.length, required['생산1팀PE']),
    '생산2팀': calculateGap(team2Employees.length, required['생산2팀']),
  };

  // 3단계: 크로스배치 적용
  const crossAssignments = suggestCrossAssignments(gaps, input.available_employees);
  for (const cross of crossAssignments) {
    // 기본 배치에서 해당 직원 찾아서 크로스배치로 변경
    const idx = allAssignments.findIndex(
      (a) => a.employee_id === cross.employee_id && !a.is_cross_assigned,
    );
    if (idx !== -1) {
      allAssignments[idx] = cross;
    }
  }

  // 4단계: 요약 생성
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
