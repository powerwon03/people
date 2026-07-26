import type { EquipmentOperation, Shift, StaffingInput, StaffingResult } from '@/types';
import { calculateFactory1Staffing } from './rules-factory1';
import { calculateFactory2Staffing } from './rules-factory2';
import { calculatePackagingAdditional } from './packaging-rules';

/**
 * 통합 인원산출 계산기
 * 생산계획의 설비별 가동 여부 + 생산 제품을 입력으로
 * 공장별 인원산출 규칙을 적용하여 필요 인원을 산출한다.
 */
export function calculateStaffing(input: StaffingInput): StaffingResult {
  const { date, shift, factory_id, operations } = input;

  const operatingEquipment = operations.filter((op) => op.is_operating);

  // 1공장 / 2공장 구분하여 계산
  const isFactory1 = operatingEquipment.some((op) =>
    isFactory1Equipment(op.equipment_code),
  );
  const isFactory2 = operatingEquipment.some((op) =>
    isFactory2Equipment(op.equipment_code),
  );

  let equipmentDetails: Record<string, number> = {};
  let baseRequired = 0;
  let combinationAdditional = 0;

  if (isFactory1) {
    const f1Result = calculateFactory1Staffing(operatingEquipment);
    equipmentDetails = { ...equipmentDetails, ...f1Result.details };
    baseRequired += f1Result.total;
  }

  if (isFactory2) {
    const f2Result = calculateFactory2Staffing(operatingEquipment, shift);
    equipmentDetails = { ...equipmentDetails, ...f2Result.details };
    baseRequired += f2Result.total;
    combinationAdditional = f2Result.combinationAdditional;
  }

  // 포장박스 추가인원 (1공장만)
  const packagingAdditional = isFactory1
    ? calculatePackagingAdditional(operatingEquipment)
    : 0;

  const totalRequired = baseRequired + packagingAdditional + combinationAdditional;

  return {
    date,
    shift,
    factory_id,
    equipment_details: equipmentDetails,
    base_required: baseRequired,
    packaging_additional: packagingAdditional,
    combination_additional: combinationAdditional,
    total_required: totalRequired,
  };
}

// 1공장 설비 코드 패턴
const FACTORY1_CODES = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09',
  '10', '11', '12', '13', '14', '15', '16', '17', '18',
  'A1', 'B1', 'B2', 'E1', 'E2', 'E3', 'E4',
];

// 2공장 설비 코드 패턴
const FACTORY2_CODES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];

function isFactory1Equipment(code: string): boolean {
  return FACTORY1_CODES.includes(code);
}

function isFactory2Equipment(code: string): boolean {
  return FACTORY2_CODES.includes(code);
}

/**
 * 특정 날짜/교대에 가용한 인원 수를 조회
 */
export function getAvailableWorkers(
  _department: string,
  _date: string,
  _shift: Shift,
): number {
  // TODO: Supabase에서 근무계획표 조회하여 가용 인원 반환
  return 0;
}
