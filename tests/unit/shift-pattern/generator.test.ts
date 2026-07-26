import { describe, it, expect } from 'vitest';
import {
  getShiftType,
  generateSchedule,
  getWorkingGroups,
  generateAnnualSchedule,
} from '@/lib/shift-pattern/generator';

describe('3조 교대 패턴 생성기', () => {
  // Excel 데이터 기반 검증: 2026-01-01(목)부터의 패턴
  // A조: 야,휴,휴,주,주,주,주,휴,휴,야,야,야 (12일 주기)
  // B조: 휴,야,야,야,야,휴,휴,주,주,주,주,휴
  // C조: 주,주,주,주,휴,휴,야,야,야,야,휴,휴

  describe('getShiftType - 기준일 패턴 검증', () => {
    it('2026-01-01 A조는 야간', () => {
      expect(getShiftType('A', new Date(2026, 0, 1))).toBe('야');
    });

    it('2026-01-01 B조는 주간', () => {
      expect(getShiftType('B', new Date(2026, 0, 1))).toBe('주');
    });

    it('2026-01-01 C조는 휴무', () => {
      expect(getShiftType('C', new Date(2026, 0, 1))).toBe('휴');
    });

    it('A조 12일 전체 패턴 일치', () => {
      const expected = ['야', '야', '휴', '휴', '주', '주', '주', '주', '휴', '휴', '야', '야'];
      for (let i = 0; i < 12; i++) {
        expect(getShiftType('A', new Date(2026, 0, 1 + i))).toBe(expected[i]);
      }
    });

    it('B조 12일 전체 패턴 일치', () => {
      const expected = ['주', '주', '주', '주', '휴', '휴', '야', '야', '야', '야', '휴', '휴'];
      for (let i = 0; i < 12; i++) {
        expect(getShiftType('B', new Date(2026, 0, 1 + i))).toBe(expected[i]);
      }
    });

    it('C조 12일 전체 패턴 일치', () => {
      const expected = ['휴', '휴', '야', '야', '야', '야', '휴', '휴', '주', '주', '주', '주'];
      for (let i = 0; i < 12; i++) {
        expect(getShiftType('C', new Date(2026, 0, 1 + i))).toBe(expected[i]);
      }
    });
  });

  describe('getShiftType - 12일 주기 반복 검증', () => {
    it('A조 13일째는 1일째와 동일 (12일 주기)', () => {
      expect(getShiftType('A', new Date(2026, 0, 13))).toBe(
        getShiftType('A', new Date(2026, 0, 1))
      );
    });

    it('24일 주기도 동일', () => {
      expect(getShiftType('B', new Date(2026, 0, 25))).toBe(
        getShiftType('B', new Date(2026, 0, 1))
      );
    });
  });

  describe('매일 2개 조 근무 + 1개 조 휴무 검증', () => {
    it('2026년 1월 1일~12일 동안 매일 정확히 1개 조 휴무', () => {
      for (let i = 0; i < 12; i++) {
        const date = new Date(2026, 0, 1 + i);
        const shifts = {
          A: getShiftType('A', date),
          B: getShiftType('B', date),
          C: getShiftType('C', date),
        };
        const restCount = Object.values(shifts).filter((s) => s === '휴').length;
        expect(restCount).toBe(1);
      }
    });

    it('매일 주간 1개 조 + 야간 1개 조 근무', () => {
      for (let i = 0; i < 12; i++) {
        const date = new Date(2026, 0, 1 + i);
        const shifts = {
          A: getShiftType('A', date),
          B: getShiftType('B', date),
          C: getShiftType('C', date),
        };
        const dayCount = Object.values(shifts).filter((s) => s === '주').length;
        const nightCount = Object.values(shifts).filter((s) => s === '야').length;
        expect(dayCount).toBe(1);
        expect(nightCount).toBe(1);
      }
    });

    it('2026년 전체 365일 동안 매일 주1+야1+휴1 패턴 유지', () => {
      for (let i = 0; i < 365; i++) {
        const date = new Date(2026, 0, 1 + i);
        const shifts = ['A', 'B', 'C'].map((g) =>
          getShiftType(g as 'A' | 'B' | 'C', date)
        );
        expect(shifts.filter((s) => s === '주').length).toBe(1);
        expect(shifts.filter((s) => s === '야').length).toBe(1);
        expect(shifts.filter((s) => s === '휴').length).toBe(1);
      }
    });
  });

  describe('getWorkingGroups', () => {
    it('2026-01-01 주간 근무조는 B조', () => {
      expect(getWorkingGroups(new Date(2026, 0, 1), '주간')).toEqual(['B']);
    });

    it('2026-01-01 야간 근무조는 A조', () => {
      expect(getWorkingGroups(new Date(2026, 0, 1), '야간')).toEqual(['A']);
    });

    it('2026-01-05 주간 근무조는 A조', () => {
      // A조 패턴 idx 4 = 주
      expect(getWorkingGroups(new Date(2026, 0, 5), '주간')).toEqual(['A']);
    });

    it('항상 정확히 1개 조만 반환', () => {
      for (let i = 0; i < 30; i++) {
        const date = new Date(2026, 0, 1 + i);
        expect(getWorkingGroups(date, '주간')).toHaveLength(1);
        expect(getWorkingGroups(date, '야간')).toHaveLength(1);
      }
    });
  });

  describe('generateSchedule', () => {
    it('7일 스케줄 생성 시 7개 항목 반환', () => {
      const schedule = generateSchedule('A', new Date(2026, 0, 1), 7);
      expect(schedule).toHaveLength(7);
    });

    it('생성된 스케줄 날짜가 연속적', () => {
      const schedule = generateSchedule('A', new Date(2026, 0, 1), 5);
      for (let i = 1; i < schedule.length; i++) {
        const diff = schedule[i].date.getTime() - schedule[i - 1].date.getTime();
        expect(diff).toBe(24 * 60 * 60 * 1000); // 1일
      }
    });
  });

  describe('generateAnnualSchedule', () => {
    it('2026년 연간 스케줄은 365일', () => {
      const schedule = generateAnnualSchedule('A', 2026);
      expect(schedule).toHaveLength(365);
    });

    it('윤년(2028년) 연간 스케줄은 366일', () => {
      const schedule = generateAnnualSchedule('A', 2028);
      expect(schedule).toHaveLength(366);
    });

    it('A조 연간 근무일수: 주간 ~122일, 야간 ~122일, 휴무 ~121일', () => {
      const schedule = generateAnnualSchedule('A', 2026);
      const day = schedule.filter((s) => s.shiftType === '주').length;
      const night = schedule.filter((s) => s.shiftType === '야').length;
      const rest = schedule.filter((s) => s.shiftType === '휴').length;
      // 365 / 12 * 4 ≈ 121.67 (주간4일 + 야간4일 + 휴무4일 per 12일)
      expect(day).toBeGreaterThanOrEqual(120);
      expect(day).toBeLessThanOrEqual(124);
      expect(night).toBeGreaterThanOrEqual(120);
      expect(night).toBeLessThanOrEqual(124);
      expect(rest).toBeGreaterThanOrEqual(120);
      expect(rest).toBeLessThanOrEqual(124);
      expect(day + night + rest).toBe(365);
    });
  });
});
