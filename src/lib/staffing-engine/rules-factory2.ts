import type { EquipmentOperation, Shift } from '@/types';

type Factory2Result = {
  details: Record<string, number>;
  total: number;
  combinationAdditional: number;
};

/**
 * 2공장 인원산출 규칙 엔진
 *
 * 규칙 (1)~(8): 설비별 기본 인원
 * 규칙 (9-1)~(9-3): 설비 조합 추가 인원
 */
export function calculateFactory2Staffing(
  operations: EquipmentOperation[],
  shift: Shift,
): Factory2Result {
  const details: Record<string, number> = {};
  const operatingMap = new Map<string, EquipmentOperation>();

  for (const op of operations) {
    if (op.is_operating) {
      operatingMap.set(op.equipment_code, op);
    }
  }

  // (1) S1호기 - '테일러 946' 또는 '테일러 1.89L' 생산 시: 1명
  // (2) S1호기 - '진로 4.0L' 생산 시: 3명
  // (3) S1호기 - '진로 2.7L' 생산 시: 2명
  const s1 = operatingMap.get('S1');
  if (s1) {
    const product = s1.product_name ?? '';
    if (matchProduct(product, '진로', '4.0')) {
      details['S1'] = 3;
    } else if (matchProduct(product, '진로', '2.7')) {
      details['S1'] = 2;
    } else if (
      matchProduct(product, '테일러', '946') ||
      matchProduct(product, '테일러', '1.89')
    ) {
      details['S1'] = 1;
    } else {
      // 기타 제품 - 기본 1명
      details['S1'] = 1;
    }
  }

  // (4) S2, S3호기: 각 1명
  for (const code of ['S2', 'S3']) {
    if (operatingMap.has(code)) {
      details[code] = 1;
    }
  }

  // (5) S4호기 - '참기름 1.5' 생산 시: 2명
  // (6) S4호기 - '참기름 1.5' 외: 1명
  const s4 = operatingMap.get('S4');
  if (s4) {
    const product = s4.product_name ?? '';
    if (matchProduct(product, '참기름', '1.5')) {
      details['S4'] = 2;
    } else {
      details['S4'] = 1;
    }
  }

  // (7) S5, S6호기: 각 1명
  for (const code of ['S5', 'S6']) {
    if (operatingMap.has(code)) {
      details[code] = 1;
    }
  }

  // (8) S7호기 - 주간: 1명, 야간: 2명
  if (operatingMap.has('S7')) {
    details['S7'] = shift === '주간' ? 1 : 2;
  }

  const baseTotal = Object.values(details).reduce((sum, v) => sum + v, 0);

  // 조합 추가 인원
  let combinationAdditional = 0;

  // (9-1) S6, S7 호기 중 하나라도 가동이면: +2명
  if (operatingMap.has('S6') || operatingMap.has('S7')) {
    combinationAdditional += 2;
  }

  // (9-2) S1~S5 중 2~3대 가동: +1명
  // (9-3) S1~S5 중 4대 이상 가동: +2명
  const s1to5Count = ['S1', 'S2', 'S3', 'S4', 'S5'].filter((code) =>
    operatingMap.has(code),
  ).length;

  if (s1to5Count >= 4) {
    combinationAdditional += 2;
  } else if (s1to5Count >= 2) {
    combinationAdditional += 1;
  }

  return {
    details,
    total: baseTotal,
    combinationAdditional,
  };
}

/**
 * 제품명 매칭 (부분 일치)
 * 예: matchProduct('테일러 946ML UV', '테일러', '946') => true
 */
function matchProduct(productName: string, ...keywords: string[]): boolean {
  const normalized = productName.toLowerCase();
  return keywords.every((kw) => normalized.includes(kw.toLowerCase()));
}
