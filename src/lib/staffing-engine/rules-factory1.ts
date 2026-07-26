import type { EquipmentOperation } from '@/types';

type Factory1Result = {
  details: Record<string, number>;
  total: number;
};

/**
 * 1공장 인원산출 규칙 엔진
 *
 * 규칙 (1)~(12): 설비별 기본 인원
 * 포장박스 추가인원은 별도 모듈에서 계산
 */
export function calculateFactory1Staffing(
  operations: EquipmentOperation[],
): Factory1Result {
  const details: Record<string, number> = {};
  const operating = new Set(
    operations
      .filter((op) => op.is_operating)
      .map((op) => op.equipment_code),
  );

  // (1) 01, 02, 03호기: 각 1명
  for (const code of ['01', '02', '03']) {
    if (operating.has(code)) {
      details[code] = 1;
    }
  }

  // (2) 04, 05, 06, 07호기: 각 0.5명
  for (const code of ['04', '05', '06', '07']) {
    if (operating.has(code)) {
      details[code] = 0.5;
    }
  }

  // (3) 08, 09호기: 세트 운영 - 둘 중 하나라도 가동이면 1명
  if (operating.has('08') || operating.has('09')) {
    details['08_09'] = 1;
  }

  // (4) 10, 11, 12호기: 각 1명
  for (const code of ['10', '11', '12']) {
    if (operating.has(code)) {
      details[code] = 1;
    }
  }

  // (5) 13, 14호기: 각 0.5명
  for (const code of ['13', '14']) {
    if (operating.has(code)) {
      details[code] = 0.5;
    }
  }

  // (6) 15, 16호기: 각 1명
  for (const code of ['15', '16']) {
    if (operating.has(code)) {
      details[code] = 1;
    }
  }

  // (7) 17호기: 0.5명
  if (operating.has('17')) {
    details['17'] = 0.5;
  }

  // (8) 18호기: 1명
  if (operating.has('18')) {
    details['18'] = 1;
  }

  // (9) B1호기: 1명
  if (operating.has('B1')) {
    details['B1'] = 1;
  }

  // (10) B2호기: 1.5명
  if (operating.has('B2')) {
    details['B2'] = 1.5;
  }

  // (11) E1, E2호기: 세트 운영 - 둘 중 하나라도 가동이면 1명
  if (operating.has('E1') || operating.has('E2')) {
    details['E1_E2'] = 1;
  }

  // (12) E3, E4호기: 각 1명
  for (const code of ['E3', 'E4']) {
    if (operating.has(code)) {
      details[code] = 1;
    }
  }

  const total = Object.values(details).reduce((sum, v) => sum + v, 0);

  return { details, total };
}
