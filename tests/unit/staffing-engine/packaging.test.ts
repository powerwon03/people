import { describe, it, expect } from 'vitest';
import {
  calculatePackagingAdditional,
  getAdditionalByBoxCount,
} from '@/lib/staffing-engine/packaging-rules';
import type { EquipmentOperation } from '@/types';

function op(
  code: string,
  boxCount12h: number | null,
  operating = true,
): EquipmentOperation {
  return {
    equipment_code: code,
    is_operating: operating,
    product_name: null,
    product_id: null,
    box_count_12h: boxCount12h,
  };
}

describe('포장박스 기반 추가 인원', () => {
  describe('구간별 추가 인원', () => {
    it('0장 이하면 0명', () => {
      expect(getAdditionalByBoxCount(0)).toBe(0);
      expect(getAdditionalByBoxCount(-10)).toBe(0);
    });

    it('500장 이내면 2명', () => {
      expect(getAdditionalByBoxCount(1)).toBe(2);
      expect(getAdditionalByBoxCount(250)).toBe(2);
      expect(getAdditionalByBoxCount(500)).toBe(2);
    });

    it('501~800장이면 3명', () => {
      expect(getAdditionalByBoxCount(501)).toBe(3);
      expect(getAdditionalByBoxCount(650)).toBe(3);
      expect(getAdditionalByBoxCount(800)).toBe(3);
    });

    it('801장 이상이면 4명', () => {
      expect(getAdditionalByBoxCount(801)).toBe(4);
      expect(getAdditionalByBoxCount(1000)).toBe(4);
      expect(getAdditionalByBoxCount(5000)).toBe(4);
    });
  });

  describe('설비별 포장박스 합산', () => {
    it('가동 설비 없으면 0명', () => {
      const result = calculatePackagingAdditional([]);
      expect(result).toBe(0);
    });

    it('포장박스 정보 없는 설비만 있으면 0명', () => {
      const result = calculatePackagingAdditional([op('01', null)]);
      expect(result).toBe(0);
    });

    it('비가동 설비는 합산에서 제외', () => {
      const result = calculatePackagingAdditional([
        op('01', 300, false), // 비가동 -> 제외
        op('02', 100, true),
      ]);
      expect(result).toBe(2); // 100장 -> 500 이내 -> 2명
    });

    it('여러 설비 합산: 147.3 + 216.5 = 363.8 -> 500 이내 -> 2명', () => {
      const result = calculatePackagingAdditional([
        op('10', 147.3), // 새한 3.6L
        op('03', 216.5), // 호프 1.5L
      ]);
      expect(result).toBe(2);
    });

    it('합산 600장 -> 501~800 -> 3명', () => {
      const result = calculatePackagingAdditional([
        op('01', 300),
        op('02', 300),
      ]);
      expect(result).toBe(3);
    });

    it('합산 900장 -> 801 이상 -> 4명', () => {
      const result = calculatePackagingAdditional([
        op('01', 300),
        op('02', 300),
        op('03', 300),
      ]);
      expect(result).toBe(4);
    });
  });
});
