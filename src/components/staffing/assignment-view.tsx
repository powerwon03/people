'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { assignEmployees } from '@/lib/assignment-engine/assigner';
import { getWorkingGroups } from '@/lib/shift-pattern/generator';
import type {
  AssignmentInput,
  AssignmentResult,
  AssignmentTemplate,
  AvailableEmployee,
  Department,
  EmployeeAssignment,
  Shift,
  ShiftGroup,
} from '@/types';

type EmployeeRow = {
  id: string;
  name: string;
  department: string;
  shift_group: string;
  role: string;
  gender: string;
  affiliation: string;
};

type SavedAssignment = {
  id: string;
  employee_id: string;
  department: string;
  role: string;
  sub_department: string | null;
  is_cross_assigned: boolean;
  cross_from: string | null;
  status: string;
  employee: {
    name: string;
    department: string;
    role: string;
    gender: string;
    affiliation: string;
    shift_group: string;
  } | null;
};

type Props = {
  employees: EmployeeRow[];
};

const DEPARTMENTS: Department[] = ['생산1팀PET', '생산1팀PE', '생산2팀'];

function getTemplate(date: Date): AssignmentTemplate {
  const day = date.getDay();
  if (day === 1) return '월요일';
  if (day === 0 || day === 6) return '주말';
  return '평일';
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AssignmentView({ employees }: Props): React.ReactElement {
  const [selectedDate, setSelectedDate] = useState(toLocalDateStr(new Date()));
  const [selectedShift, setSelectedShift] = useState<Shift>('주간');
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [summary, setSummary] = useState<AssignmentResult['summary'] | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDept, setEditDept] = useState<Department>('생산1팀PET');
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);

  const date = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate]);
  const template = useMemo(() => getTemplate(date), [date]);
  const workingGroups = useMemo(() => getWorkingGroups(date, selectedShift), [date, selectedShift]);

  // 생산계획 존재 여부 확인
  const checkPlan = useCallback(async (): Promise<void> => {
    try {
      // 해당 날짜가 포함된 주의 월요일 계산
      const d = new Date(selectedDate + 'T00:00:00');
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      const mondayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const res = await fetch(`/api/production-plans?week_start=${mondayStr}`);
      const plans = await res.json();

      if (Array.isArray(plans) && plans.length > 0) {
        // 해당 날짜에 가동 중인 설비가 있는지 확인
        const plan = plans[0];
        const hasDetails = (plan.details ?? []).some(
          (det: { date: string; shift: string; status: string }) =>
            det.date === selectedDate && det.shift === selectedShift && det.status === '가동',
        );
        setHasPlan(hasDetails);
      } else {
        setHasPlan(false);
      }
    } catch {
      setHasPlan(false);
    }
  }, [selectedDate, selectedShift]);

  useEffect(() => { checkPlan(); }, [checkPlan]);

  // 저장된 배치 로드
  const loadSaved = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments?date=${selectedDate}&shift=${selectedShift}`);
      const data = await res.json();

      if (data.saved && data.assignments.length > 0) {
        const loaded: EmployeeAssignment[] = data.assignments.map((a: SavedAssignment) => ({
          employee_id: a.employee_id,
          employee_name: a.employee?.name ?? '',
          department: a.employee?.department ?? a.department,
          role: a.employee?.role ?? a.role,
          affiliation: a.employee?.affiliation ?? '새한',
          assigned_department: a.department as Department,
          assigned_sub_department: a.sub_department as 'PE' | 'PET' | null,
          is_cross_assigned: a.is_cross_assigned,
          cross_from: a.cross_from,
        }));
        setAssignments(loaded);
        rebuildSummary(loaded);
        setIsSaved(true);
      } else {
        setAssignments([]);
        setSummary(null);
        setIsSaved(false);
      }
      setHasChanges(false);
    } catch {
      setAssignments([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedShift]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  function rebuildSummary(assigns: EmployeeAssignment[]): void {
    const byDept: Record<string, { required: number; assigned: number; gap: number; cross_in: number; cross_out: number }> = {};
    for (const dept of DEPARTMENTS) {
      const assignedToDept = assigns.filter((a) => a.assigned_department === dept);
      const crossIn = assignedToDept.filter((a) => a.is_cross_assigned).length;
      const crossOut = assigns.filter((a) => a.department === dept && a.is_cross_assigned && a.assigned_department !== dept).length;
      byDept[dept] = { required: 0, assigned: assignedToDept.length, gap: 0, cross_in: crossIn, cross_out: crossOut };
    }
    setSummary({ total_assigned: assigns.length, by_department: byDept });
  }

  // 자동배치 실행 + DB 저장
  async function handleGenerate(): Promise<void> {
    if (!hasPlan) return;

    const available: AvailableEmployee[] = employees
      .filter((e) => workingGroups.includes(e.shift_group as ShiftGroup))
      .map((e) => ({
        id: e.id, name: e.name,
        department: e.department as AvailableEmployee['department'],
        role: e.role as AvailableEmployee['role'],
        gender: e.gender as 'M' | 'F',
        affiliation: e.affiliation as AvailableEmployee['affiliation'],
        shift_group: e.shift_group as ShiftGroup,
      }));

    // DB에서 인원산출 결과 조회 (해당 날짜의 최신 계획)
    let staffF1: AssignmentInput['staffing_result_factory1'] = null;
    let staffF2: AssignmentInput['staffing_result_factory2'] = null;
    let noCalcWarning = false;

    try {
      // 해당 날짜가 포함된 주의 월요일 계산
      const targetDate = new Date(selectedDate + 'T00:00:00');
      const dayOfWeek = targetDate.getDay();
      const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      targetDate.setDate(targetDate.getDate() + mondayDiff);
      const weekStart = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

      // 최신 생산계획의 산출 결과 가져오기
      const plansRes = await fetch(`/api/production-plans?week_start=${weekStart}`);
      const plans = await plansRes.json();

      // 해당 날짜를 포함하는 계획 찾기
      let planId: string | null = null;
      if (Array.isArray(plans)) {
        for (const p of plans) {
          if (p.id) { planId = p.id; break; }
        }
      }

      if (planId) {
        const calcRes = await fetch(`/api/staffing/calculate?plan_id=${planId}`);
        const calcData = await calcRes.json();

        if (calcData.saved && calcData.results?.length > 0) {
          // 해당 날짜+교대의 산출 결과 찾기
          for (const dr of calcData.results) {
            if (dr.date === selectedDate && dr.shift === selectedShift) {
              for (const fr of dr.results ?? []) {
                const sr = {
                  date: selectedDate, shift: selectedShift,
                  factory_id: fr.factory_id,
                  equipment_details: fr.equipment_details ?? {},
                  base_required: fr.base_required ?? 0,
                  packaging_additional: fr.packaging_additional ?? 0,
                  combination_additional: fr.combination_additional ?? 0,
                  total_required: fr.total_required ?? 0,
                };
                if (fr.factory_id?.includes('f1')) staffF1 = sr;
                else if (fr.factory_id?.includes('f2')) staffF2 = sr;
              }
            }
          }
        }
      }
    } catch { /* 산출 결과 없으면 기본값 사용 */ }

    if (!staffF1 && !staffF2) {
      noCalcWarning = true;
    }

    const result = assignEmployees({
      date: selectedDate, shift: selectedShift, template,
      staffing_result_factory1: staffF1,
      staffing_result_factory2: staffF2,
      available_employees: available,
    });

    if (noCalcWarning) {
      alert('인원산출 결과가 없습니다.\n먼저 인원산출을 실행해주세요.');
      return;
    }

    setAssignments(result.assignments);
    setSummary(result.summary);

    // DB 저장
    setSaving(true);
    try {
      const rows = result.assignments.map((a) => ({
        employee_id: a.employee_id,
        department: a.assigned_department,
        role: a.role,
        sub_department: a.assigned_sub_department,
        is_cross_assigned: a.is_cross_assigned,
        cross_from: a.cross_from,
        status: '자동배치',
        notes: null,
      }));

      await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, shift: selectedShift, assignments: rows }),
      });
      setIsSaved(true);
      setHasChanges(false);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  // 수동 조정: 부서 변경
  function handleEditStart(empId: string, currentDept: Department): void {
    setEditingId(empId);
    setEditDept(currentDept);
  }

  function handleEditConfirm(): void {
    if (!editingId) return;

    setAssignments((prev) => {
      const updated = prev.map((a) => {
        if (a.employee_id !== editingId) return a;

        const newDept = editDept;
        const isCross = newDept !== a.department;
        let crossFrom: EmployeeAssignment['cross_from'] = null;
        if (isCross) {
          if (a.department === '생산1팀PET' && newDept === '생산1팀PE') crossFrom = 'pet';
          else if (a.department === '생산1팀PE' && newDept === '생산1팀PET') crossFrom = 'pe';
          else if (a.department === '생산2팀') crossFrom = '2';
          else if (newDept === '생산2팀') crossFrom = '1';
          else crossFrom = '대';
        }

        const result: EmployeeAssignment = {
          ...a,
          assigned_department: newDept,
          assigned_sub_department: newDept === '생산1팀PE' ? 'PE' : newDept === '생산1팀PET' ? 'PET' : null,
          is_cross_assigned: isCross,
          cross_from: crossFrom,
        };
        return result;
      });
      rebuildSummary(updated);
      return updated;
    });

    setEditingId(null);
    setHasChanges(true);
  }

  // 변경사항 저장
  async function handleSaveChanges(): Promise<void> {
    setSaving(true);
    try {
      const rows = assignments.map((a) => ({
        employee_id: a.employee_id,
        department: a.assigned_department,
        role: a.role,
        sub_department: a.assigned_sub_department,
        is_cross_assigned: a.is_cross_assigned,
        cross_from: a.cross_from,
        status: '수정',
        notes: null,
      }));

      await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, shift: selectedShift, assignments: rows }),
      });
      setIsSaved(true);
      setHasChanges(false);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 날짜/교대 선택 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm"
          />
          <div className="flex gap-1">
            {(['주간', '야간'] as const).map((s) => (
              <Button key={s} size="sm" variant={selectedShift === s ? 'default' : 'outline'}
                onClick={() => setSelectedShift(s)}>
                {s}
              </Button>
            ))}
          </div>
          <Badge variant="outline">{template}</Badge>
          <span className="text-muted-foreground text-sm">
            근무조: {workingGroups.map((g) => `${g}조`).join(', ') || '-'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {loading && <span className="text-muted-foreground text-sm">로딩...</span>}
            {isSaved && !hasChanges && <Badge variant="outline" className="text-green-600">저장됨</Badge>}
            {hasChanges && (
              <Button size="sm" onClick={handleSaveChanges} disabled={saving}>
                {saving ? '저장 중...' : '변경사항 저장'}
              </Button>
            )}
            <Button size="sm" variant={isSaved ? 'outline' : 'default'}
              onClick={handleGenerate} disabled={saving || !hasPlan}>
              {isSaved ? '재배치' : '자동 배치 실행'}
            </Button>
            {hasPlan === false && (
              <span className="text-sm text-red-500 font-medium">생산계획 없음 (배치 불가)</span>
            )}
          </div>
        </div>
      </Card>

      {/* 배치 결과 */}
      {assignments.length > 0 && summary && (
        <>
          {/* 요약 */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4 text-center">
              <p className="text-muted-foreground text-sm">총 배치</p>
              <p className="text-2xl font-bold">{summary.total_assigned}명</p>
            </Card>
            {Object.entries(summary.by_department).map(([dept, s]) => (
              <Card key={dept} className="p-4">
                <p className="text-sm font-medium">{dept}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold">{s.assigned}명</span>
                  {(s.cross_in > 0 || s.cross_out > 0) && (
                    <span className="text-muted-foreground text-xs">
                      {s.cross_in > 0 && `+${s.cross_in}IN`}
                      {s.cross_out > 0 && ` -${s.cross_out}OUT`}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* 배치 상세 테이블 */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
              <h3 className="font-semibold">배치 상세</h3>
              <span className="text-muted-foreground text-xs">직원의 배치부서를 클릭하면 수동 조정할 수 있습니다</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="px-4 py-2.5 text-left font-medium">이름</th>
                    <th className="px-4 py-2.5 text-left font-medium">원소속</th>
                    <th className="px-4 py-2.5 text-left font-medium">역할</th>
                    <th className="px-4 py-2.5 text-left font-medium">배치부서</th>
                    <th className="px-4 py-2.5 text-left font-medium">소속사</th>
                    <th className="px-4 py-2.5 text-center font-medium">크로스</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.employee_id} className={cn('border-b last:border-0', a.is_cross_assigned && 'bg-yellow-50')}>
                      <td className="px-4 py-2 font-medium">{a.employee_name}</td>
                      <td className="px-4 py-2">{a.department}</td>
                      <td className="px-4 py-2">{a.role}</td>
                      <td className="px-4 py-2">
                        {editingId === a.employee_id ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={editDept}
                              onChange={(e) => setEditDept(e.target.value as Department)}
                              className="rounded border px-2 py-1 text-sm"
                            >
                              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <Button size="sm" variant="ghost" onClick={handleEditConfirm}>확인</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>취소</Button>
                          </div>
                        ) : (
                          <button
                            className="rounded px-2 py-0.5 text-left hover:bg-gray-100"
                            onClick={() => handleEditStart(a.employee_id, a.assigned_department)}
                          >
                            {a.assigned_department}
                            {a.assigned_sub_department && ` (${a.assigned_sub_department})`}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={a.affiliation === '새한' ? 'default' : 'secondary'}>
                          {a.affiliation}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {a.is_cross_assigned ? (
                          <Badge variant="destructive">({a.cross_from})</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* 배치 없을 때 */}
      {!loading && assignments.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">
            이 날짜의 배치 데이터가 없습니다. "자동 배치 실행"을 클릭해주세요.
          </p>
        </Card>
      )}
    </div>
  );
}
