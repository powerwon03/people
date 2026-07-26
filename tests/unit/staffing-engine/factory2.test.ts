import { describe, it, expect } from 'vitest';
import { calculateFactory2Staffing } from '@/lib/staffing-engine/rules-factory2';
import type { EquipmentOperation } from '@/types';

function op(
  code: string,
  operating = true,
  product: string | null = null,
): EquipmentOperation {
  return {
    equipment_code: code,
    is_operating: operating,
    product_name: product,
    product_id: null,
    box_count_12h: null,
  };
}

describe('2공장 인원산출 규칙', () => {
  describe('규칙 (1): S1호기 - 테일러 946/1.89L 생산 시 1명', () => {
    it('테일러 946ML 생산 시 1명', () => {
      const result = calculateFactory2Staffing(
        [op('S1', true, '테일러 946ML UV CL')],
        '주간',
      );
      expect(result.details['S1']).toBe(1);
    });

    it('테일러 1.89L 생산 시 1명', () => {
      const result = calculateFactory2Staffing(
        [op('S1', true, '테일러 1.89L UV [86G UV]')],
        '주간',
      );
      expect(result.details['S1']).toBe(1);
    });
  });

  describe('규칙 (2): S1호기 - 진로 4.0L 생산 시 3명', () => {
    it('진로 4.0L 생산 시 3명', () => {
      const result = calculateFactory2Staffing(
        [op('S1', true, '진로 4.0L 25%')],
        '주간',
      );
      expect(result.details['S1']).toBe(3);
    });
  });

  describe('규칙 (3): S1호기 - 진로 2.7L 생산 시 2명', () => {
    it('진로 2.7L 생산 시 2명', () => {
      const result = calculateFactory2Staffing(
        [op('S1', true, '진로 2.7L 20%')],
        '주간',
      );
      expect(result.details['S1']).toBe(2);
    });
  });

  describe('규칙 (4): S2, S3호기 - 각 1명', () => {
    it('S2 가동 시 1명', () => {
      const result = calculateFactory2Staffing([op('S2')], '주간');
      expect(result.details['S2']).toBe(1);
    });

    it('S3 가동 시 1명', () => {
      const result = calculateFactory2Staffing([op('S3')], '주간');
      expect(result.details['S3']).toBe(1);
    });
  });

  describe('규칙 (5): S4호기 - 참기름 1.5 생산 시 2명', () => {
    it('참기름 1.5 생산 시 2명', () => {
      const result = calculateFactory2Staffing(
        [op('S4', true, '참기름 1.5 CL')],
        '주간',
      );
      expect(result.details['S4']).toBe(2);
    });
  });

  describe('규칙 (6): S4호기 - 참기름 1.5 외 제품 1명', () => {
    it('간장 1.7L 생산 시 1명', () => {
      const result = calculateFactory2Staffing(
        [op('S4', true, '1.7L 간장 (65g)')],
        '주간',
      );
      expect(result.details['S4']).toBe(1);
    });
  });

  describe('규칙 (7): S5, S6호기 - 각 1명', () => {
    it('S5 가동 시 1명', () => {
      const result = calculateFactory2Staffing([op('S5')], '주간');
      expect(result.details['S5']).toBe(1);
    });

    it('S6 가동 시 1명', () => {
      const result = calculateFactory2Staffing([op('S6')], '주간');
      expect(result.details['S6']).toBe(1);
    });
  });

  describe('규칙 (8): S7호기 - 주간 1명, 야간 2명', () => {
    it('S7 주간 가동 시 1명', () => {
      const result = calculateFactory2Staffing([op('S7')], '주간');
      expect(result.details['S7']).toBe(1);
    });

    it('S7 야간 가동 시 2명', () => {
      const result = calculateFactory2Staffing([op('S7')], '야간');
      expect(result.details['S7']).toBe(2);
    });
  });

  describe('규칙 (9-1): S6/S7 가동 시 +2명 추가', () => {
    it('S6만 가동 시 +2명', () => {
      const result = calculateFactory2Staffing([op('S6')], '주간');
      expect(result.combinationAdditional).toBe(2);
    });

    it('S7만 가동 시 +2명', () => {
      const result = calculateFactory2Staffing([op('S7')], '주간');
      expect(result.combinationAdditional).toBe(2);
    });

    it('S6, S7 동시 가동 시에도 +2명', () => {
      const result = calculateFactory2Staffing(
        [op('S6'), op('S7')],
        '주간',
      );
      expect(result.combinationAdditional).toBe(2);
    });
  });

  describe('규칙 (9-2): S1~S5 중 2~3대 가동 시 +1명', () => {
    it('S1, S2 가동 시 +1명', () => {
      const result = calculateFactory2Staffing(
        [op('S1', true, '테일러 946'), op('S2')],
        '주간',
      );
      expect(result.combinationAdditional).toBe(1);
    });

    it('S1, S2, S3 가동 시 +1명', () => {
      const result = calculateFactory2Staffing(
        [op('S1', true, '테일러 946'), op('S2'), op('S3')],
        '주간',
      );
      expect(result.combinationAdditional).toBe(1);
    });
  });

  describe('규칙 (9-3): S1~S5 중 4대 이상 가동 시 +2명', () => {
    it('S1~S4 가동 시 +2명', () => {
      const result = calculateFactory2Staffing(
        [
          op('S1', true, '테일러 946'),
          op('S2'),
          op('S3'),
          op('S4', true, '간장 1.8'),
        ],
        '주간',
      );
      expect(result.combinationAdditional).toBe(2);
    });

    it('S1~S5 모두 가동 시 +2명', () => {
      const result = calculateFactory2Staffing(
        [
          op('S1', true, '테일러 946'),
          op('S2'),
          op('S3'),
          op('S4', true, '간장 1.8'),
          op('S5'),
        ],
        '주간',
      );
      expect(result.combinationAdditional).toBe(2);
    });
  });

  describe('복합 규칙 (9-1 + 9-2/9-3)', () => {
    it('S1~S5 중 3대 + S6 가동 시: +1(9-2) + +2(9-1) = +3명', () => {
      const result = calculateFactory2Staffing(
        [
          op('S1', true, '테일러 946'),
          op('S2'),
          op('S3'),
          op('S6'),
        ],
        '주간',
      );
      expect(result.combinationAdditional).toBe(3); // 9-2(+1) + 9-1(+2)
    });

    it('S1~S5 중 4대 + S7 가동 시: +2(9-3) + +2(9-1) = +4명', () => {
      const result = calculateFactory2Staffing(
        [
          op('S1', true, '테일러 946'),
          op('S2'),
          op('S3'),
          op('S4', true, '간장 1.8'),
          op('S7'),
        ],
        '야간',
      );
      // 기본: 1+1+1+1+2=6, 추가: 2(9-3)+2(9-1)=4
      expect(result.combinationAdditional).toBe(4);
    });
  });

  describe('통합 시나리오', () => {
    it('가동 설비 없으면 0명', () => {
      const result = calculateFactory2Staffing([], '주간');
      expect(result.total).toBe(0);
      expect(result.combinationAdditional).toBe(0);
    });

    it('전체 설비 주간 가동 시 종합 계산', () => {
      const result = calculateFactory2Staffing(
        [
          op('S1', true, '테일러 946'),  // 1
          op('S2'),                      // 1
          op('S3'),                      // 1
          op('S4', true, '참기름 1.5'),  // 2
          op('S5'),                      // 1
          op('S6'),                      // 1
          op('S7'),                      // 주간 1
        ],
        '주간',
      );
      // 기본: 1+1+1+2+1+1+1 = 8
      expect(result.total).toBe(8);
      // 조합: 9-1(S6/S7) +2, 9-3(S1~S5 5대) +2 = 4
      expect(result.combinationAdditional).toBe(4);
    });
  });
});
