import { describe, it, expect } from 'vitest';
import {
  assignEmployees,
  calculateGap,
  getAvailableByDepartment,
  suggestCrossAssignments,
} from '@/lib/assignment-engine/assigner';
import type {
  AvailableEmployee,
  StaffingResult,
  Department,
  EmployeeRole,
  Affiliation,
} from '@/types';

// 테스트 헬퍼: 직원 생성
function makeEmployee(
  overrides: Partial<AvailableEmployee> & { id: string; name: string },
): AvailableEmployee {
  return {
    department: '생산1팀PET',
    role: 'OP',
    gender: 'M',
    affiliation: '새한',
    shift_group: 'A',
    ...overrides,
  };
}

// 테스트용 직원 풀
function createTestEmployees(): AvailableEmployee[] {
  return [
    // 생산1팀PET A조
    makeEmployee({ id: '1', name: '김태형', department: '생산1팀PET', role: '반장' }),
    makeEmployee({ id: '2', name: '임기한', department: '생산1팀PET', role: 'OP' }),
    makeEmployee({ id: '3', name: '박현준', department: '생산1팀PET', role: 'OP' }),
    makeEmployee({ id: '4', name: '나빈', department: '생산1팀PET', role: '운반포장' }),
    makeEmployee({ id: '5', name: '프라카스', department: '생산1팀PET', role: '운반포장' }),
    makeEmployee({ id: '6', name: '강순애', department: '생산1팀PET', role: '검사원', gender: 'F', affiliation: '세영' }),
    makeEmployee({ id: '7', name: '경은호', department: '생산1팀PET', role: '검사원', gender: 'F', affiliation: '세영' }),
    makeEmployee({ id: '8', name: '강나현', department: '생산1팀PET', role: '검사원', gender: 'F', affiliation: '피너' }),
    // 생산1팀PE A조
    makeEmployee({ id: '9', name: '김옥령', department: '생산1팀PE', role: '검사원', gender: 'F', affiliation: '세영' }),
    // 생산2팀 A조
    makeEmployee({ id: '10', name: '최상진', department: '생산2팀', role: '반장' }),
    makeEmployee({ id: '11', name: '김경돈', department: '생산2팀', role: 'OP' }),
    makeEmployee({ id: '12', name: '슈드제널', department: '생산2팀', role: '운반포장' }),
    makeEmployee({ id: '13', name: '압두무탈립', department: '생산2팀', role: '운반포장' }),
    makeEmployee({ id: '14', name: '왕현주', department: '생산2팀', role: '검사원', gender: 'F', affiliation: '세영' }),
    makeEmployee({ id: '15', name: '권옥주', department: '생산2팀', role: '검사원', gender: 'F', affiliation: '다연' }),
    makeEmployee({ id: '16', name: '남미순', department: '생산2팀', role: '검사원', gender: 'F', affiliation: '다연' }),
  ];
}

// 테스트용 인원산출 결과
function createFactory1Result(total: number): StaffingResult {
  return {
    date: '2026-07-01',
    shift: '주간',
    factory_id: 'f1',
    equipment_details: {},
    base_required: total - 2,
    packaging_additional: 2,
    combination_additional: 0,
    total_required: total,
  };
}

function createFactory2Result(total: number): StaffingResult {
  return {
    date: '2026-07-01',
    shift: '주간',
    factory_id: 'f2',
    equipment_details: {},
    base_required: total,
    packaging_additional: 0,
    combination_additional: 0,
    total_required: total,
  };
}

describe('자동 배치 엔진', () => {
  describe('getAvailableByDepartment - 부서별 가용 인원 분류', () => {
    it('부서별로 직원을 그룹핑한다', () => {
      const employees = createTestEmployees();
      const grouped = getAvailableByDepartment(employees);

      expect(grouped['생산1팀PET']).toHaveLength(8);
      expect(grouped['생산1팀PE']).toHaveLength(1);
      expect(grouped['생산2팀']).toHaveLength(7);
    });

    it('빈 배열 입력 시 빈 객체 반환', () => {
      const grouped = getAvailableByDepartment([]);
      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });

  describe('calculateGap - 과부족 계산', () => {
    it('가용인원이 충분할 때 양수(과잉) 반환', () => {
      const gap = calculateGap(10, 8);
      expect(gap).toBe(2);
    });

    it('가용인원이 부족할 때 음수 반환', () => {
      const gap = calculateGap(5, 8);
      expect(gap).toBe(-3);
    });

    it('가용인원과 필요인원이 같을 때 0 반환', () => {
      const gap = calculateGap(8, 8);
      expect(gap).toBe(0);
    });
  });

  describe('assignEmployees - 기본 배치', () => {
    it('필요인원 이하일 때 모든 가용인원을 배치한다', () => {
      const employees = createTestEmployees();
      const result = assignEmployees({
        date: '2026-07-01',
        shift: '주간',
        template: '평일',
        staffing_result_factory1: createFactory1Result(10),
        staffing_result_factory2: createFactory2Result(5),
        available_employees: employees,
      });

      expect(result.assignments.length).toBeGreaterThan(0);
      expect(result.date).toBe('2026-07-01');
      expect(result.shift).toBe('주간');
    });

    it('반장은 항상 배치된다', () => {
      const employees = createTestEmployees();
      const result = assignEmployees({
        date: '2026-07-01',
        shift: '주간',
        template: '평일',
        staffing_result_factory1: createFactory1Result(10),
        staffing_result_factory2: createFactory2Result(5),
        available_employees: employees,
      });

      const leaders = result.assignments.filter((a) => a.role === '반장');
      expect(leaders.length).toBeGreaterThanOrEqual(2); // 1팀반장 + 2팀반장
    });

    it('배치 결과에 부서별 요약이 포함된다', () => {
      const employees = createTestEmployees();
      const result = assignEmployees({
        date: '2026-07-01',
        shift: '주간',
        template: '평일',
        staffing_result_factory1: createFactory1Result(10),
        staffing_result_factory2: createFactory2Result(5),
        available_employees: employees,
      });

      expect(result.summary).toBeDefined();
      expect(result.summary.total_assigned).toBeGreaterThan(0);
      expect(result.summary.by_department).toBeDefined();
    });

    it('원래 부서에 배치된 직원은 is_cross_assigned가 false', () => {
      const employees = createTestEmployees();
      const result = assignEmployees({
        date: '2026-07-01',
        shift: '주간',
        template: '평일',
        staffing_result_factory1: createFactory1Result(10),
        staffing_result_factory2: createFactory2Result(5),
        available_employees: employees,
      });

      const normalAssignments = result.assignments.filter(
        (a) => a.department === a.assigned_department && !a.is_cross_assigned,
      );
      expect(normalAssignments.length).toBeGreaterThan(0);
      normalAssignments.forEach((a) => {
        expect(a.cross_from).toBeNull();
      });
    });
  });

  describe('suggestCrossAssignments - 크로스배치 제안', () => {
    it('1팀 부족 + 2팀 과잉 시 2팀→1팀 크로스배치 제안', () => {
      const suggestions = suggestCrossAssignments(
        { '생산1팀PET': -2, '생산1팀PE': 0, '생산2팀': 3 },
        createTestEmployees(),
      );

      const crossFrom2 = suggestions.filter((s) => s.cross_from === '2');
      expect(crossFrom2.length).toBeGreaterThan(0);
    });

    it('PE 부족 + PET 과잉 시 PET→PE 크로스배치 제안', () => {
      const suggestions = suggestCrossAssignments(
        { '생산1팀PET': 2, '생산1팀PE': -1, '생산2팀': 0 },
        createTestEmployees(),
      );

      const crossFromPET = suggestions.filter((s) => s.cross_from === 'pet');
      expect(crossFromPET.length).toBeGreaterThan(0);
    });

    it('모든 부서 과부족 없으면 빈 배열 반환', () => {
      const suggestions = suggestCrossAssignments(
        { '생산1팀PET': 0, '생산1팀PE': 0, '생산2팀': 0 },
        createTestEmployees(),
      );
      expect(suggestions).toHaveLength(0);
    });

    it('크로스배치 제안에 원래 소속 표기가 포함된다', () => {
      const suggestions = suggestCrossAssignments(
        { '생산1팀PET': -1, '생산1팀PE': 0, '생산2팀': 2 },
        createTestEmployees(),
      );

      suggestions.forEach((s) => {
        expect(s.is_cross_assigned).toBe(true);
        expect(s.cross_from).not.toBeNull();
      });
    });
  });

  describe('assignEmployees - 주말/월요일 템플릿', () => {
    it('주말 템플릿은 2팀 인원이 감소한다', () => {
      const employees = createTestEmployees();
      const weekday = assignEmployees({
        date: '2026-07-01',
        shift: '주간',
        template: '평일',
        staffing_result_factory1: createFactory1Result(10),
        staffing_result_factory2: createFactory2Result(5),
        available_employees: employees,
      });
      const weekend = assignEmployees({
        date: '2026-07-04',
        shift: '주간',
        template: '주말',
        staffing_result_factory1: createFactory1Result(10),
        staffing_result_factory2: createFactory2Result(3),
        available_employees: employees,
      });

      const weekday2team = weekday.summary.by_department['생산2팀']?.required ?? 0;
      const weekend2team = weekend.summary.by_department['생산2팀']?.required ?? 0;
      expect(weekend2team).toBeLessThanOrEqual(weekday2team);
    });
  });
});
