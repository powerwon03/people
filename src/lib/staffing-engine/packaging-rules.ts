import type { EquipmentOperation } from '@/types';

/**
 * 1공장 포장박스 기반 추가 인원 계산
 *
 * 12시간 내 포장박스 수량 합산 기준:
 * - 500장 이내: +2명
 * - 501~800장: +3명
 * - 801장 이상: +4명
 */
export function calculatePackagingAdditional(
  operations: EquipmentOperation[],
): number {
  const totalBoxes = operations
    .filter((op) => op.is_operating && op.box_count_12h != null)
    .reduce((sum, op) => sum + (op.box_count_12h ?? 0), 0);

  // 가동 설비가 없으면 추가 인원 없음
  if (totalBoxes === 0) {
    return 0;
  }

  return getAdditionalByBoxCount(totalBoxes);
}

/**
 * 포장박스 수량 구간별 추가 인원 반환
 */
export function getAdditionalByBoxCount(totalBoxes: number): number {
  if (totalBoxes <= 0) return 0;
  if (totalBoxes <= 500) return 2;
  if (totalBoxes <= 800) return 3;
  return 4; // 801 이상
}
