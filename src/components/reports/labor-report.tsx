'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PeriodType = 'weekly' | 'monthly';

type EmployeeSummary = {
  employee_id: string;
  employee_name: string;
  employee_no: string | null;
  department: string;
  affiliation: string;
  shift_group: string;
  role: string;
  day_shifts: number;
  night_shifts: number;
  overtime_days: number;
  leave_days: number;
  absent_days: number;
  late_days: number;
  total_work_days: number;
  cross_assignments: number;
};

type DepartmentSummary = {
  department: string;
  total_employees: number;
  total_work_days: number;
  total_overtime: number;
  total_leave: number;
  total_absent: number;
};

type AffiliationSummary = {
  affiliation: string;
  total_employees: number;
  total_work_days: number;
  total_overtime: number;
};

type Totals = {
  total_employees: number;
  working_employees: number;
  total_work_days: number;
  total_overtime: number;
  total_leave: number;
  total_absent: number;
  total_cross: number;
};

type ReportData = {
  period: PeriodType;
  start_date: string;
  end_date: string;
  employees: EmployeeSummary[];
  by_department: DepartmentSummary[];
  by_affiliation: AffiliationSummary[];
  totals: Totals;
};

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatPeriodLabel(period: PeriodType, dateStr: string): string {
  const d = new Date(dateStr);
  if (period === 'weekly') {
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    return `${d.getMonth() + 1}/${d.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`;
  }
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

const AFFILIATION_COLORS: Record<string, string> = {
  '새한': 'bg-blue-100 text-blue-800',
  '세영': 'bg-green-100 text-green-800',
  '다연': 'bg-purple-100 text-purple-800',
  '피너': 'bg-orange-100 text-orange-800',
};

export function LaborReport(): React.ReactElement {
  const [period, setPeriod] = useState<PeriodType>('weekly');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterAffiliation, setFilterAffiliation] = useState<string>('all');

  const dateStr = useMemo((): string => {
    const now = new Date();
    if (period === 'weekly') {
      const monday = getMonday(now);
      monday.setDate(monday.getDate() + offset * 7);
      return toDateStr(monday);
    }
    const monthStart = getMonthStart(now);
    monthStart.setMonth(monthStart.getMonth() + offset);
    return toDateStr(monthStart);
  }, [period, offset]);

  const loadReport = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/labor?period=${period}&date=${dateStr}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [period, dateStr]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const filteredEmployees = useMemo((): EmployeeSummary[] => {
    if (!data) return [];
    return data.employees.filter((e) => {
      if (filterDept !== 'all' && e.department !== filterDept) return false;
      if (filterAffiliation !== 'all' && e.affiliation !== filterAffiliation) return false;
      return true;
    });
  }, [data, filterDept, filterAffiliation]);

  return (
    <div className="space-y-4">
      {/* 컨트롤바 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(['weekly', 'monthly'] as const).map((p) => (
            <Button key={p} variant={period === p ? 'default' : 'outline'} size="sm"
              onClick={() => { setPeriod(p); setOffset(0); }}>
              {p === 'weekly' ? '주별' : '월별'}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setOffset((v) => v - 1)}>
            {period === 'weekly' ? '← 이전주' : '← 이전월'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOffset(0)}>
            {period === 'weekly' ? '이번주' : '이번달'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOffset((v) => v + 1)}>
            {period === 'weekly' ? '다음주 →' : '다음월 →'}
          </Button>
        </div>
        <span className="text-sm font-medium">
          {formatPeriodLabel(period, dateStr)}
        </span>
        {loading && <span className="text-muted-foreground text-sm">로딩...</span>}
      </div>

      {/* 총계 카드 */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <SummaryCard label="총 인원" value={data.totals.total_employees} unit="명" />
          <SummaryCard label="근무 인원" value={data.totals.working_employees} unit="명" />
          <SummaryCard label="총 근무일" value={data.totals.total_work_days} unit="일" />
          <SummaryCard label="특근" value={data.totals.total_overtime} unit="일" highlight="amber" />
          <SummaryCard label="연차" value={data.totals.total_leave} unit="일" />
          <SummaryCard label="결근" value={data.totals.total_absent} unit="일" highlight="red" />
          <SummaryCard label="크로스배치" value={data.totals.total_cross} unit="건" />
        </div>
      )}

      {/* 소속별 집계 */}
      {data && data.by_affiliation.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">소속별 집계</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium">소속</th>
                  <th className="px-3 py-2 font-medium text-right">인원</th>
                  <th className="px-3 py-2 font-medium text-right">총 근무일</th>
                  <th className="px-3 py-2 font-medium text-right">특근</th>
                  <th className="px-3 py-2 font-medium text-right">1인 평균</th>
                </tr>
              </thead>
              <tbody>
                {data.by_affiliation.map((aff) => (
                  <tr key={aff.affiliation} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={AFFILIATION_COLORS[aff.affiliation] ?? ''}>
                        {aff.affiliation}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">{aff.total_employees}명</td>
                    <td className="px-3 py-2 text-right">{aff.total_work_days}일</td>
                    <td className="px-3 py-2 text-right">{aff.total_overtime}일</td>
                    <td className="px-3 py-2 text-right">
                      {aff.total_employees > 0 ? (aff.total_work_days / aff.total_employees).toFixed(1) : '-'}일
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 부서별 집계 */}
      {data && data.by_department.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">부서별 집계</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium">부서</th>
                  <th className="px-3 py-2 font-medium text-right">인원</th>
                  <th className="px-3 py-2 font-medium text-right">총 근무일</th>
                  <th className="px-3 py-2 font-medium text-right">특근</th>
                  <th className="px-3 py-2 font-medium text-right">연차</th>
                  <th className="px-3 py-2 font-medium text-right">결근</th>
                </tr>
              </thead>
              <tbody>
                {data.by_department.map((dept) => (
                  <tr key={dept.department} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{dept.department}</td>
                    <td className="px-3 py-2 text-right">{dept.total_employees}명</td>
                    <td className="px-3 py-2 text-right">{dept.total_work_days}일</td>
                    <td className="px-3 py-2 text-right">{dept.total_overtime}일</td>
                    <td className="px-3 py-2 text-right">{dept.total_leave}일</td>
                    <td className="px-3 py-2 text-right">
                      <span className={dept.total_absent > 0 ? 'text-red-600 font-medium' : ''}>
                        {dept.total_absent}일
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 직원별 상세 */}
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">직원별 상세</h3>
          <div className="flex gap-2">
            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
              className="rounded border px-2 py-1 text-xs">
              <option value="all">전체 부서</option>
              <option value="생산1팀PE">생산1팀PE</option>
              <option value="생산1팀PET">생산1팀PET</option>
              <option value="생산2팀">생산2팀</option>
            </select>
            <select value={filterAffiliation} onChange={(e) => setFilterAffiliation(e.target.value)}
              className="rounded border px-2 py-1 text-xs">
              <option value="all">전체 소속</option>
              <option value="새한">새한</option>
              <option value="세영">세영</option>
              <option value="다연">다연</option>
              <option value="피너">피너</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-2 py-2 font-medium">이름</th>
                <th className="px-2 py-2 font-medium">부서</th>
                <th className="px-2 py-2 font-medium">소속</th>
                <th className="px-2 py-2 font-medium">조</th>
                <th className="px-2 py-2 font-medium">역할</th>
                <th className="px-2 py-2 font-medium text-right">주간</th>
                <th className="px-2 py-2 font-medium text-right">야간</th>
                <th className="px-2 py-2 font-medium text-right">특근</th>
                <th className="px-2 py-2 font-medium text-right">연차</th>
                <th className="px-2 py-2 font-medium text-right">결근</th>
                <th className="px-2 py-2 font-medium text-right">지각</th>
                <th className="px-2 py-2 font-medium text-right">합계</th>
                <th className="px-2 py-2 font-medium text-right">크로스</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr><td colSpan={13} className="py-8 text-center text-muted-foreground">데이터가 없습니다.</td></tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-2 py-1.5 font-medium">{emp.employee_name}</td>
                    <td className="px-2 py-1.5 text-xs">{emp.department}</td>
                    <td className="px-2 py-1.5">
                      <Badge variant="outline" className={cn('text-xs', AFFILIATION_COLORS[emp.affiliation] ?? '')}>
                        {emp.affiliation}
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5 text-center">{emp.shift_group}</td>
                    <td className="px-2 py-1.5 text-xs">{emp.role}</td>
                    <td className="px-2 py-1.5 text-right">{emp.day_shifts}</td>
                    <td className="px-2 py-1.5 text-right">{emp.night_shifts}</td>
                    <td className="px-2 py-1.5 text-right">
                      <span className={emp.overtime_days > 0 ? 'text-amber-600 font-medium' : ''}>{emp.overtime_days}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right">{emp.leave_days}</td>
                    <td className="px-2 py-1.5 text-right">
                      <span className={emp.absent_days > 0 ? 'text-red-600 font-medium' : ''}>{emp.absent_days}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span className={emp.late_days > 0 ? 'text-orange-600' : ''}>{emp.late_days}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold">{emp.total_work_days}</td>
                    <td className="px-2 py-1.5 text-right">{emp.cross_assignments}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredEmployees.length > 0 && (
          <p className="text-muted-foreground mt-2 text-xs">{filteredEmployees.length}명 표시</p>
        )}
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, unit, highlight }: {
  label: string;
  value: number;
  unit: string;
  highlight?: 'amber' | 'red';
}): React.ReactElement {
  return (
    <Card className="p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn('text-xl font-bold',
        highlight === 'amber' && value > 0 && 'text-amber-600',
        highlight === 'red' && value > 0 && 'text-red-600',
      )}>
        {value}<span className="text-sm font-normal ml-0.5">{unit}</span>
      </p>
    </Card>
  );
}
