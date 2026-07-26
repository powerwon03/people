import { describe, it, expect } from 'vitest';
import { calculateFactory1Staffing } from '@/lib/staffing-engine/rules-factory1';
import type { EquipmentOperation } from '@/types';

function op(code: string, operating = true, product: string | null = null): EquipmentOperation {
  return {
    equipment_code: code,
    is_operating: operating,
    product_name: product,
    product_id: null,
    box_count_12h: null,
  };
}

describe('1공장 인원산출 규칙', () => {
  describe('규칙 (1): 01, 02, 03호기 - 각 1명', () => {
    it('01호기 가동 시 1명', () => {
      const result = calculateFactory1Staffing([op('01')]);
      expect(result.details['01']).toBe(1);
      expect(result.total).toBe(1);
    });

    it('01, 02, 03호기 모두 가동 시 3명', () => {
      const result = calculateFactory1Staffing([op('01'), op('02'), op('03')]);
      expect(result.total).toBe(3);
    });

    it('02호기 비가동 시 배정 없음', () => {
      const result = calculateFactory1Staffing([op('02', false)]);
      expect(result.details['02']).toBeUndefined();
      expect(result.total).toBe(0);
    });
  });

  describe('규칙 (2): 04, 05, 06, 07호기 - 각 0.5명', () => {
    it('04호기 가동 시 0.5명', () => {
      const result = calculateFactory1Staffing([op('04')]);
      expect(result.details['04']).toBe(0.5);
    });

    it('04~07 모두 가동 시 2명', () => {
      const result = calculateFactory1Staffing([
        op('04'), op('05'), op('06'), op('07'),
      ]);
      expect(result.total).toBe(2);
    });
  });

  describe('규칙 (3): 08, 09호기 세트 - 1명', () => {
    it('08호기만 가동 시 1명', () => {
      const result = calculateFactory1Staffing([op('08')]);
      expect(result.details['08_09']).toBe(1);
      expect(result.total).toBe(1);
    });

    it('09호기만 가동 시 1명', () => {
      const result = calculateFactory1Staffing([op('09')]);
      expect(result.details['08_09']).toBe(1);
    });

    it('08, 09호기 동시 가동 시에도 1명', () => {
      const result = calculateFactory1Staffing([op('08'), op('09')]);
      expect(result.details['08_09']).toBe(1);
      expect(result.total).toBe(1);
    });

    it('08, 09 모두 비가동 시 0명', () => {
      const result = calculateFactory1Staffing([op('08', false), op('09', false)]);
      expect(result.details['08_09']).toBeUndefined();
    });
  });

  describe('규칙 (4): 10, 11, 12호기 - 각 1명', () => {
    it('10호기 가동 시 1명', () => {
      const result = calculateFactory1Staffing([op('10')]);
      expect(result.details['10']).toBe(1);
    });

    it('10, 11, 12 모두 가동 시 3명', () => {
      const result = calculateFactory1Staffing([op('10'), op('11'), op('12')]);
      expect(result.total).toBe(3);
    });
  });

  describe('규칙 (5): 13, 14호기 - 각 0.5명', () => {
    it('13호기 가동 시 0.5명', () => {
      const result = calculateFactory1Staffing([op('13')]);
      expect(result.details['13']).toBe(0.5);
    });

    it('13, 14 모두 가동 시 1명', () => {
      const result = calculateFactory1Staffing([op('13'), op('14')]);
      expect(result.total).toBe(1);
    });
  });

  describe('규칙 (6): 15, 16호기 - 각 1명', () => {
    it('15호기 가동 시 1명', () => {
      const result = calculateFactory1Staffing([op('15')]);
      expect(result.details['15']).toBe(1);
    });
  });

  describe('규칙 (7): 17호기 - 0.5명', () => {
    it('17호기 가동 시 0.5명', () => {
      const result = calculateFactory1Staffing([op('17')]);
      expect(result.details['17']).toBe(0.5);
    });
  });

  describe('규칙 (8): 18호기 - 1명', () => {
    it('18호기 가동 시 1명', () => {
      const result = calculateFactory1Staffing([op('18')]);
      expect(result.details['18']).toBe(1);
    });
  });

  describe('규칙 (9): B1호기 - 1명', () => {
    it('B1호기 가동 시 1명', () => {
      const result = calculateFactory1Staffing([op('B1')]);
      expect(result.details['B1']).toBe(1);
    });
  });

  describe('규칙 (10): B2호기 - 1.5명', () => {
    it('B2호기 가동 시 1.5명', () => {
      const result = calculateFactory1Staffing([op('B2')]);
      expect(result.details['B2']).toBe(1.5);
    });
  });

  describe('규칙 (11): E1, E2호기 세트 - 1명', () => {
    it('E1호기만 가동 시 1명', () => {
      const result = calculateFactory1Staffing([op('E1')]);
      expect(result.details['E1_E2']).toBe(1);
    });

    it('E2호기만 가동 시 1명', () => {
      const result = calculateFactory1Staffing([op('E2')]);
      expect(result.details['E1_E2']).toBe(1);
    });

    it('E1, E2 동시 가동 시에도 1명', () => {
      const result = calculateFactory1Staffing([op('E1'), op('E2')]);
      expect(result.details['E1_E2']).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('규칙 (12): E3, E4호기 - 각 1명', () => {
    it('E3호기 가동 시 1명', () => {
      const result = calculateFactory1Staffing([op('E3')]);
      expect(result.details['E3']).toBe(1);
    });

    it('E3, E4 모두 가동 시 2명', () => {
      const result = calculateFactory1Staffing([op('E3'), op('E4')]);
      expect(result.total).toBe(2);
    });
  });

  describe('통합 시나리오', () => {
    it('가동 설비 없으면 0명', () => {
      const result = calculateFactory1Staffing([]);
      expect(result.total).toBe(0);
    });

    it('전체 설비 가동 시 종합 계산', () => {
      const allOps = [
        op('01'), op('02'), op('03'),           // 3명
        op('04'), op('05'), op('06'), op('07'),  // 2명
        op('08'), op('09'),                      // 1명 (세트)
        op('10'), op('11'), op('12'),            // 3명
        op('13'), op('14'),                      // 1명
        op('15'), op('16'),                      // 2명
        op('17'),                                // 0.5명
        op('18'),                                // 1명
        op('B1'),                                // 1명
        op('B2'),                                // 1.5명
        op('E1'), op('E2'),                      // 1명 (세트)
        op('E3'), op('E4'),                      // 2명
      ];
      const result = calculateFactory1Staffing(allOps);
      // 3 + 2 + 1 + 3 + 1 + 2 + 0.5 + 1 + 1 + 1.5 + 1 + 2 = 19
      expect(result.total).toBe(19);
    });

    it('비가동 설비는 계산에서 제외', () => {
      const result = calculateFactory1Staffing([
        op('01'),
        op('02', false),
        op('03'),
      ]);
      expect(result.total).toBe(2);
      expect(result.details['02']).toBeUndefined();
    });
  });
});
