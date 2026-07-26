import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const period = (searchParams.get('period') ?? 'weekly') as PeriodType;
  const dateParam = searchParams.get('date'); // YYYY-MM-DD (주별: 해당 주 월요일, 월별: 해당 월 1일)

  if (!dateParam) {
    return NextResponse.json({ error: 'date 파라미터가 필요합니다.' }, { status: 400 });
  }

  // 기간 계산
  const startDate = new Date(dateParam);
  let endDate: Date;

  if (period === 'weekly') {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
  } else {
    endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  }

  const startStr = dateParam;
  const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  type EmployeeRow = {
    id: string;
    name: string;
    employee_no: string | null;
    department: string;
    affiliation: string;
    shift_group: string;
    role: string;
  };

  // 재직 직원 목록
  const { data: employees, error: empError } = await supabase
    .from('saehan_employees')
    .select('id, name, employee_no, department, affiliation, shift_group, role')
    .eq('status', '재직') as unknown as { data: EmployeeRow[] | null; error: { message: string } | null };

  if (empError) {
    return NextResponse.json({ error: empError.message }, { status: 500 });
  }

  // 근무 스케줄 조회
  const { data: schedules, error: schedError } = await supabase
    .from('saehan_work_schedules')
    .select('employee_id, date, shift_type')
    .gte('date', startStr)
    .lte('date', endStr);

  if (schedError) {
    return NextResponse.json({ error: schedError.message }, { status: 500 });
  }

  // 출결 기록 조회
  const { data: attendance, error: attError } = await supabase
    .from('saehan_attendance_logs')
    .select('employee_id, date, shift, status')
    .gte('date', startStr)
    .lte('date', endStr);

  if (attError) {
    return NextResponse.json({ error: attError.message }, { status: 500 });
  }

  // 크로스배치 조회
  const { data: crossAssignments, error: crossError } = await supabase
    .from('saehan_worker_assignments')
    .select('employee_id')
    .gte('date', startStr)
    .lte('date', endStr)
    .eq('is_cross_assigned', true);

  if (crossError) {
    return NextResponse.json({ error: crossError.message }, { status: 500 });
  }

  type ScheduleRow = { employee_id: string; date: string; shift_type: string };
  type AttendanceRow = { employee_id: string; date: string; shift: string; status: string };
  type CrossRow = { employee_id: string };

  // 직원별 집계
  const employeeSummaries: EmployeeSummary[] = (employees ?? []).map((emp) => {
    const empSchedules = (schedules as ScheduleRow[] ?? []).filter((s) => s.employee_id === emp.id);
    const empAttendance = (attendance as AttendanceRow[] ?? []).filter((a) => a.employee_id === emp.id);
    const empCross = (crossAssignments as CrossRow[] ?? []).filter((c) => c.employee_id === emp.id);

    const dayShifts = empSchedules.filter((s) => s.shift_type === '주').length;
    const nightShifts = empSchedules.filter((s) => s.shift_type === '야').length;
    const overtimeDays = empSchedules.filter((s) => s.shift_type === '특근').length;
    const leaveDays = empSchedules.filter((s) => s.shift_type === '연차').length;
    const absentDays = empAttendance.filter((a) => a.status === '결근').length;
    const lateDays = empAttendance.filter((a) => a.status === '지각').length;

    return {
      employee_id: emp.id,
      employee_name: emp.name,
      employee_no: emp.employee_no,
      department: emp.department,
      affiliation: emp.affiliation,
      shift_group: emp.shift_group,
      role: emp.role,
      day_shifts: dayShifts,
      night_shifts: nightShifts,
      overtime_days: overtimeDays,
      leave_days: leaveDays,
      absent_days: absentDays,
      late_days: lateDays,
      total_work_days: dayShifts + nightShifts + overtimeDays,
      cross_assignments: empCross.length,
    };
  });

  // 부서별 집계
  const deptMap = new Map<string, DepartmentSummary>();
  for (const emp of employeeSummaries) {
    const existing = deptMap.get(emp.department);
    if (existing) {
      existing.total_employees += 1;
      existing.total_work_days += emp.total_work_days;
      existing.total_overtime += emp.overtime_days;
      existing.total_leave += emp.leave_days;
      existing.total_absent += emp.absent_days;
    } else {
      deptMap.set(emp.department, {
        department: emp.department,
        total_employees: 1,
        total_work_days: emp.total_work_days,
        total_overtime: emp.overtime_days,
        total_leave: emp.leave_days,
        total_absent: emp.absent_days,
      });
    }
  }

  // 소속별 집계
  const affMap = new Map<string, AffiliationSummary>();
  for (const emp of employeeSummaries) {
    const existing = affMap.get(emp.affiliation);
    if (existing) {
      existing.total_employees += 1;
      existing.total_work_days += emp.total_work_days;
      existing.total_overtime += emp.overtime_days;
    } else {
      affMap.set(emp.affiliation, {
        affiliation: emp.affiliation,
        total_employees: 1,
        total_work_days: emp.total_work_days,
        total_overtime: emp.overtime_days,
      });
    }
  }

  return NextResponse.json({
    period,
    start_date: startStr,
    end_date: endStr,
    employees: employeeSummaries.filter((e) => e.total_work_days > 0 || e.leave_days > 0 || e.absent_days > 0),
    by_department: Array.from(deptMap.values()),
    by_affiliation: Array.from(affMap.values()),
    totals: {
      total_employees: employeeSummaries.length,
      working_employees: employeeSummaries.filter((e) => e.total_work_days > 0).length,
      total_work_days: employeeSummaries.reduce((s, e) => s + e.total_work_days, 0),
      total_overtime: employeeSummaries.reduce((s, e) => s + e.overtime_days, 0),
      total_leave: employeeSummaries.reduce((s, e) => s + e.leave_days, 0),
      total_absent: employeeSummaries.reduce((s, e) => s + e.absent_days, 0),
      total_cross: employeeSummaries.reduce((s, e) => s + e.cross_assignments, 0),
    },
  });
}
