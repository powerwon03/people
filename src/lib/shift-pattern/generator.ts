import { addDays, differenceInDays } from 'date-fns';
import type { ShiftGroup, ShiftType } from '@/types';

/**
 * 3조 교대 패턴 생성기
 *
 * 패턴: 4일 근무 -> 2일 휴무 -> 교대 전환(주간<->야간) 순환
 * 3개 조가 시차를 두고 순환하여 매일 2개 조가 근무(주간 1조 + 야간 1조), 1개 조 휴무
 *
 * 기본 12일 주기: 야야야야 휴휴 주주주주 휴휴
 * 3조가 4일 간격으로 오프셋되어 매일 정확히 1주+1야+1휴 보장
 *
 * 2026-01-01 기준 패턴:
 * A조: 야야 휴휴 주주주주 휴휴 야야
 * B조: 주주주주 휴휴 야야야야 휴휴
 * C조: 휴휴 야야야야 휴휴 주주주주
 */

// 12일 주기 기본 패턴 - 2026-01-01 기준 (주=주간, 야=야간, 휴=휴무)
// 매일 A+B+C = {주, 야, 휴} 보장 (4일 오프셋)
const BASE_PATTERN_A: ShiftType[] = [
  '야', '야', '휴', '휴', '주', '주', '주', '주', '휴', '휴', '야', '야',
];
const BASE_PATTERN_B: ShiftType[] = [
  '주', '주', '주', '주', '휴', '휴', '야', '야', '야', '야', '휴', '휴',
];
const BASE_PATTERN_C: ShiftType[] = [
  '휴', '휴', '야', '야', '야', '야', '휴', '휴', '주', '주', '주', '주',
];

const PATTERNS: Record<ShiftGroup, ShiftType[]> = {
  A: BASE_PATTERN_A,
  B: BASE_PATTERN_B,
  C: BASE_PATTERN_C,
};

// 기준일 (2026-01-01은 목요일, 실제 데이터와 맞춤)
const REFERENCE_DATE = new Date(2026, 0, 1);

/**
 * 특정 날짜에 특정 조의 근무 유형 반환
 */
export function getShiftType(
  group: ShiftGroup,
  date: Date,
): ShiftType {
  const pattern = PATTERNS[group];
  const dayOffset = differenceInDays(date, REFERENCE_DATE);
  // 음수 대응: 양수 모듈로 보정
  const index = ((dayOffset % 12) + 12) % 12;
  return pattern[index];
}

/**
 * 기간 내 특정 조의 근무 스케줄 생성
 */
export function generateSchedule(
  group: ShiftGroup,
  startDate: Date,
  days: number,
): { date: Date; shiftType: ShiftType }[] {
  const schedule: { date: Date; shiftType: ShiftType }[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    schedule.push({
      date,
      shiftType: getShiftType(group, date),
    });
  }
  return schedule;
}

/**
 * 특정 날짜/교대에 근무 가능한 조 목록 반환
 */
export function getWorkingGroups(
  date: Date,
  shift: '주간' | '야간',
): ShiftGroup[] {
  const targetType: ShiftType = shift === '주간' ? '주' : '야';
  const groups: ShiftGroup[] = [];

  for (const group of ['A', 'B', 'C'] as ShiftGroup[]) {
    if (getShiftType(group, date) === targetType) {
      groups.push(group);
    }
  }

  return groups;
}

/**
 * 연간 근무계획표 생성 (1~12월)
 */
export function generateAnnualSchedule(
  group: ShiftGroup,
  year: number,
): { date: Date; shiftType: ShiftType }[] {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const days = differenceInDays(endDate, startDate) + 1;
  return generateSchedule(group, startDate, days);
}
