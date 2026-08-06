'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type EmployeeItem = {
  id: string;
  name: string;
  department: string;
  shift_group: string;
  role: string;
  affiliation: string;
};

type Props = {
  employees: EmployeeItem[];
};

type ShiftType = '주' | '야' | '휴';

const SHIFT_COLORS: Record<string, string> = {
  '주': 'bg-blue-100 text-blue-800',
  '야': 'bg-gray-800 text-white',
  '휴': 'bg-gray-100 text-gray-400',
};

const SHIFT_CYCLE: ShiftType[] = ['주', '야', '휴'];

type RoleFilter = 'all' | '반장&OP' | '운반&포장' | '검사원';

const ROLE_FILTERS: { value: RoleFilter; label: string; description: string }[] = [
  { value: 'all', label: '전체', description: '전체 인원' },
  { value: '반장&OP', label: '반장 & OP', description: '새한소속 - 반장, OP' },
  { value: '운반&포장', label: '운반 & 포장', description: '새한소속 - 운반포장' },
  { value: '검사원', label: '검사원', description: '협력사 - 검사원' },
];

function matchesRoleFilter(emp: EmployeeItem, filter: RoleFilter): boolean {
  if (filter === 'all') return true;
  if (filter === '반장&OP') return emp.role === '반장' || emp.role === 'OP';
  if (filter === '운반&포장') return emp.role === '운반포장';
  if (filter === '검사원') return emp.role === '검사원';
  return true;
}

type AffiliationFilter = 'all' | '새한' | '협력사';

function matchesAffiliationFilter(emp: EmployeeItem, filter: AffiliationFilter): boolean {
  if (filter === 'all') return true;
  if (filter === '새한') return emp.affiliation === '새한';
  if (filter === '협력사') return emp.affiliation !== '새한';
  return true;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function AnnualScheduleView({ employees }: Props): React.ReactElement {
  const [year] = useState(2026);
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<RoleFilter>('all');
  const [selectedAffiliation, setSelectedAffiliation] = useState<AffiliationFilter>('all');
  const [scheduleMap, setScheduleMap] = useState<Record<string, ShiftType>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const daysInMonth = getDaysInMonth(year, month);
  const dates = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  }, [year, month, daysInMonth]);

  const filtered = employees.filter((e) => {
    if (selectedDept !== 'all' && e.department !== selectedDept) return false;
    if (!matchesRoleFilter(e, selectedRole)) return false;
    if (!matchesAffiliationFilter(e, selectedAffiliation)) return false;
    return true;
  });

  // DB에서 월별 스케줄 로드
  const loadSchedules = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work-schedules?year=${year}&month=${month + 1}`);
      const data: { employee_id: string; date: string; shift_type: ShiftType }[] = await res.json();

      const map: Record<string, ShiftType> = {};
      for (const row of data) {
        map[`${row.employee_id}_${row.date}`] = row.shift_type;
      }
      setScheduleMap(map);
    } catch {
      setScheduleMap({});
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // 셀 클릭: 근무 타입 순환 + DB 저장
  async function handleCellClick(employeeId: string, date: Date): Promise<void> {
    const dateStr = toDateStr(date.getFullYear(), date.getMonth(), date.getDate());
    const key = `${employeeId}_${dateStr}`;
    const current = scheduleMap[key] ?? '휴';
    const nextIdx = (SHIFT_CYCLE.indexOf(current) + 1) % SHIFT_CYCLE.length;
    const next = SHIFT_CYCLE[nextIdx];

    // 즉시 UI 반영
    setScheduleMap((prev) => ({ ...prev, [key]: next }));
    setSaving(key);

    try {
      await fetch('/api/work-schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, date: dateStr, shift_type: next }),
      });
    } catch {
      // 실패 시 되돌리기
      setScheduleMap((prev) => ({ ...prev, [key]: current }));
    } finally {
      setSaving(null);
    }
  }

  // 일별 근무 인원 집계 (DB 데이터 기반)
  const dailyCounts = useMemo(() => {
    return dates.map((date) => {
      const dateStr = toDateStr(date.getFullYear(), date.getMonth(), date.getDate());
      let day = 0;
      let night = 0;
      filtered.forEach((emp) => {
        const shift = scheduleMap[`${emp.id}_${dateStr}`];
        if (shift === '주') day++;
        if (shift === '야') night++;
      });
      return { day, night };
    });
  }, [dates, filtered, scheduleMap]);

  return (
    <div className="space-y-4">
      {/* 월 선택 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="grid grid-cols-6 gap-1 sm:flex">
          {Array.from({ length: 12 }, (_, i) => (
            <Button key={i} variant={month === i ? 'default' : 'outline'} size="sm"
              onClick={() => setMonth(i)} className="w-10">
              {i + 1}
            </Button>
          ))}
        </div>
        {loading && <span className="text-muted-foreground text-sm">로딩...</span>}
      </div>

      {/* 부서 필터 */}
      <div className="flex flex-wrap gap-1.5">
        {['all', '생산1팀PET', '생산1팀PE', '생산2팀'].map((dept) => (
          <button key={dept} onClick={() => setSelectedDept(dept)}
            className={cn('rounded-md px-3 py-2 text-sm font-medium min-h-[40px]',
              selectedDept === dept ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            {dept === 'all' ? '전체' : dept}
          </button>
        ))}
      </div>

      {/* 역할별 구분 + 소속 필터 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-gray-500 mr-1">역할:</span>
        {ROLE_FILTERS.map((rf) => (
          <button key={rf.value} onClick={() => setSelectedRole(rf.value)}
            title={rf.description}
            className={cn('rounded-md px-2.5 py-1.5 text-xs font-medium min-h-[36px]',
              selectedRole === rf.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {rf.label}
          </button>
        ))}
        <span className="mx-1 text-gray-300 hidden sm:inline">|</span>
        <span className="text-xs font-medium text-gray-500 mr-1 w-full sm:w-auto mt-1 sm:mt-0">소속:</span>
        {(['all', '새한', '협력사'] as AffiliationFilter[]).map((af) => (
          <button key={af} onClick={() => setSelectedAffiliation(af)}
            className={cn('rounded-md px-2.5 py-1.5 text-xs font-medium min-h-[36px]',
              selectedAffiliation === af ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {af === 'all' ? '전체' : af}
          </button>
        ))}
        <span className="text-muted-foreground ml-auto self-center text-sm">
          {filtered.length}명 | {year}년 {month + 1}월
        </span>
      </div>

      {/* 스케줄 그리드 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs sm:text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-1.5 sm:px-2 py-2 text-left min-w-[56px] sm:min-w-[70px]">이름</th>
                <th className="sticky left-[56px] sm:left-[70px] z-10 bg-gray-50 px-1 py-2 text-center min-w-[28px] sm:min-w-[30px]">조</th>
                {dates.map((d) => {
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th key={d.getDate()}
                      className={cn('min-w-[24px] sm:min-w-[28px] px-0 py-2 text-center', isWeekend && 'bg-red-50 text-red-600')}>
                      {d.getDate()}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 bg-white px-1.5 sm:px-2 py-1.5 font-medium whitespace-nowrap">
                    {emp.name}
                  </td>
                  <td className="sticky left-[56px] sm:left-[70px] z-10 bg-white px-1 py-1.5 text-center">
                    <Badge variant="outline" className="text-xs">{emp.shift_group}</Badge>
                  </td>
                  {dates.map((d) => {
                    const dateStr = toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
                    const key = `${emp.id}_${dateStr}`;
                    const shiftType = scheduleMap[key] ?? '';
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isSavingThis = saving === key;

                    return (
                      <td key={d.getDate()}
                        className={cn('px-0 py-1.5 text-center cursor-pointer min-w-[24px] sm:min-w-[28px]', isWeekend && 'bg-red-50/30')}
                        onClick={() => handleCellClick(emp.id, d)}>
                        {shiftType ? (
                          <span className={cn(
                            'inline-block w-6 rounded text-center text-xs font-medium leading-5',
                            SHIFT_COLORS[shiftType] ?? 'bg-gray-50',
                            isSavingThis && 'opacity-50',
                          )}>
                            {shiftType}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* 일별 집계 */}
              <tr className="border-t-2 bg-gray-50 font-semibold">
                <td className="sticky left-0 z-10 bg-gray-50 px-1.5 sm:px-2 py-1">주간</td>
                <td className="sticky left-[56px] sm:left-[70px] z-10 bg-gray-50"></td>
                {dailyCounts.map((c, i) => (
                  <td key={i} className="px-0 py-1 text-center text-blue-700">{c.day}</td>
                ))}
              </tr>
              <tr className="bg-gray-50 font-semibold">
                <td className="sticky left-0 z-10 bg-gray-50 px-1.5 sm:px-2 py-1">야간</td>
                <td className="sticky left-[56px] sm:left-[70px] z-10 bg-gray-50"></td>
                {dailyCounts.map((c, i) => (
                  <td key={i} className="px-0 py-1 text-center text-gray-600">{c.night}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* 범례 */}
      <div className="flex gap-3 text-xs">
        {Object.entries(SHIFT_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <span className={cn('inline-block h-4 w-4 rounded', color)}></span>
            {type === '주' ? '주간' : type === '야' ? '야간' : '휴무'}
          </span>
        ))}
        <span className="text-muted-foreground ml-2">셀 클릭: 주 → 야 → 휴 순환 (자동 저장)</span>
      </div>
    </div>
  );
}
