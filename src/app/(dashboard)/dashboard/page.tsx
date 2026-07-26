import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { getWorkingGroups } from '@/lib/shift-pattern/generator';
import Link from 'next/link';

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

export default async function DashboardPage(): Promise<React.ReactElement> {
  const supabase = await createClient();
  const today = new Date();
  const todayStr = toDateStr(today);
  const monday = getMonday(today);
  const mondayStr = toDateStr(monday);
  const sunday = getSunday(monday);
  const sundayStr = toDateStr(sunday);

  const [equipmentRes, employeeRes, planRes, scheduleRes, assignmentRes, attendanceRes] = await Promise.all([
    supabase
      .from('saehan_equipment')
      .select('id, factory_id')
      .eq('is_active', true),
    supabase
      .from('saehan_employees')
      .select('id, department, shift_group, affiliation')
      .eq('status', '재직'),
    supabase
      .from('saehan_production_plans')
      .select(`
        id, week_start_date, status,
        details:saehan_production_plan_details(date, shift, status, equipment_id)
      `)
      .eq('week_start_date', mondayStr)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('saehan_work_schedules')
      .select('employee_id, shift_type')
      .eq('date', todayStr)
      .in('shift_type', ['주', '야']),
    supabase
      .from('saehan_worker_assignments')
      .select('id, employee_id, is_cross_assigned, status')
      .eq('date', todayStr),
    supabase
      .from('saehan_attendance_logs')
      .select('id, employee_id, date, status')
      .gte('date', mondayStr)
      .lte('date', sundayStr)
      .in('status', ['결근', '지각']),
  ]);

  const equipment: { id: string; factory_id: string }[] = equipmentRes.data ?? [];
  const employees: { id: string; department: string; shift_group: string; affiliation: string }[] = employeeRes.data ?? [];
  const currentPlan = planRes.data as {
    id: string;
    week_start_date: string;
    status: string;
    details: { date: string; shift: string; status: string; equipment_id: string }[];
  } | null;
  const todaySchedules: { employee_id: string; shift_type: string }[] = scheduleRes.data ?? [];
  const todayAssignments: { id: string; employee_id: string; is_cross_assigned: boolean; status: string }[] = assignmentRes.data ?? [];
  const weekAttendanceIssues: { id: string; employee_id: string; date: string; status: string }[] = attendanceRes.data ?? [];

  const f1Count = equipment.filter((e) => e.factory_id === 'f1000000-0000-0000-0000-000000000001').length;
  const f2Count = equipment.filter((e) => e.factory_id === 'f2000000-0000-0000-0000-000000000002').length;
  const dayWorkers = todaySchedules.filter((s) => s.shift_type === '주').length;
  const nightWorkers = todaySchedules.filter((s) => s.shift_type === '야').length;
  const dayGroups = getWorkingGroups(today, '주간');
  const nightGroups = getWorkingGroups(today, '야간');

  // 금주 생산계획 분석
  const planDetails = currentPlan?.details ?? [];
  const todayDetails = planDetails.filter((d) => d.date === todayStr);
  const todayRunning = todayDetails.filter((d) => d.status === '가동').length;
  const todayIdle = todayDetails.filter((d) => d.status === '대기').length;
  const todayStopped = todayDetails.filter((d) => d.status === '부동').length;
  const weekRunningTotal = planDetails.filter((d) => d.status === '가동').length;

  // 오늘 배치 현황
  const todayCross = todayAssignments.filter((a) => a.is_cross_assigned).length;
  const todayAssigned = todayAssignments.length;

  // 금주 출결 이상
  const weekAbsent = weekAttendanceIssues.filter((a) => a.status === '결근').length;
  const weekLate = weekAttendanceIssues.filter((a) => a.status === '지각').length;

  // 소속별 인원
  const affiliationCounts = {
    새한: employees.filter((e) => e.affiliation === '새한').length,
    세영: employees.filter((e) => e.affiliation === '세영').length,
    다연: employees.filter((e) => e.affiliation === '다연').length,
    피너: employees.filter((e) => e.affiliation === '피너').length,
  };

  const planStatusColor = currentPlan?.status === '확정' ? 'bg-green-100 text-green-800'
    : currentPlan?.status === '잠정' ? 'bg-yellow-100 text-yellow-800'
    : 'bg-gray-100 text-gray-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-muted-foreground text-sm">
          {today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* 상단 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 금주 생산계획 */}
        <Link href="/production/plan">
          <Card className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">금주 생산계획</p>
              {currentPlan ? (
                <Badge className={planStatusColor}>{currentPlan.status}</Badge>
              ) : (
                <Badge variant="outline" className="text-gray-400">없음</Badge>
              )}
            </div>
            {currentPlan ? (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {monday.getMonth() + 1}/{monday.getDate()} ~ {sunday.getMonth() + 1}/{sunday.getDate()}
                </p>
                <div className="flex gap-3 text-sm">
                  <span className="text-green-700 font-medium">가동 {weekRunningTotal}</span>
                  <span className="text-yellow-700">대기 {planDetails.filter((d) => d.status === '대기').length}</span>
                  <span className="text-gray-500">부동 {planDetails.filter((d) => d.status === '부동').length}</span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">생산계획을 입력해주세요</p>
            )}
          </Card>
        </Link>

        {/* 오늘 설비 가동 */}
        <Link href="/production/equipment">
          <Card className="p-5 hover:shadow-md transition-shadow">
            <p className="text-muted-foreground text-sm">오늘 설비 현황</p>
            <p className="mt-2 text-3xl font-bold">{todayRunning}<span className="text-base font-normal text-muted-foreground">/{f1Count + f2Count}대</span></p>
            <div className="mt-1 flex gap-2 text-xs">
              <span className="text-green-600">가동 {todayRunning}</span>
              <span className="text-yellow-600">대기 {todayIdle}</span>
              <span className="text-gray-400">부동 {todayStopped}</span>
            </div>
          </Card>
        </Link>

        {/* 오늘 근무 인원 */}
        <Card className="p-5">
          <p className="text-muted-foreground text-sm">오늘 근무 인원</p>
          <p className="mt-2 text-3xl font-bold">{dayWorkers + nightWorkers}<span className="text-base font-normal text-muted-foreground">명</span></p>
          <div className="mt-1 text-xs text-muted-foreground">
            주간 {dayWorkers}명({dayGroups.map((g) => `${g}조`).join(',') || '-'}) · 야간 {nightWorkers}명({nightGroups.map((g) => `${g}조`).join(',') || '-'})
          </div>
        </Card>

        {/* 오늘 배치 현황 */}
        <Link href="/staffing/assign">
          <Card className="p-5 hover:shadow-md transition-shadow">
            <p className="text-muted-foreground text-sm">오늘 인력배치</p>
            {todayAssigned > 0 ? (
              <>
                <p className="mt-2 text-3xl font-bold">{todayAssigned}<span className="text-base font-normal text-muted-foreground">명</span></p>
                <div className="mt-1 text-xs">
                  {todayCross > 0 && <span className="text-amber-600 font-medium">크로스배치 {todayCross}건</span>}
                  {todayCross === 0 && <span className="text-green-600">정상 배치</span>}
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-2xl font-bold text-red-500">미배치</p>
                <p className="mt-1 text-xs text-red-400">배치를 실행해주세요</p>
              </>
            )}
          </Card>
        </Link>
      </div>

      {/* 중단 상세 */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* 인력 현황 */}
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">인력 현황</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>총 인원</span>
              <span className="font-semibold">{employees.length}명</span>
            </div>
            <hr />
            <p className="text-xs text-muted-foreground font-medium">부서별</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">생산1팀PET</span>
              <span>{employees.filter((e) => e.department === '생산1팀PET').length}명</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">생산1팀PE</span>
              <span>{employees.filter((e) => e.department === '생산1팀PE').length}명</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">생산2팀</span>
              <span>{employees.filter((e) => e.department === '생산2팀').length}명</span>
            </div>
            <hr />
            <p className="text-xs text-muted-foreground font-medium">소속별</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">새한(정규)</span>
              <span>{affiliationCounts.새한}명</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">파견(세영/다연/피너)</span>
              <span>{affiliationCounts.세영 + affiliationCounts.다연 + affiliationCounts.피너}명</span>
            </div>
            <hr />
            <p className="text-xs text-muted-foreground font-medium">조별</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">A조 / B조 / C조</span>
              <span>
                {employees.filter((e) => e.shift_group === 'A').length} / {employees.filter((e) => e.shift_group === 'B').length} / {employees.filter((e) => e.shift_group === 'C').length}
              </span>
            </div>
          </div>
        </Card>

        {/* 금주 출결 이상 */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">금주 출결 이상</h2>
            <Link href="/reports/labor" className="text-xs text-primary hover:underline">상세 보기</Link>
          </div>
          {weekAbsent === 0 && weekLate === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-2xl">✓</p>
              <p className="text-sm text-green-600 font-medium mt-1">이상 없음</p>
              <p className="text-xs text-muted-foreground mt-1">금주 결근/지각 0건</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-50 px-4 py-3 text-center flex-1">
                  <p className="text-2xl font-bold text-red-600">{weekAbsent}</p>
                  <p className="text-xs text-red-500">결근</p>
                </div>
                <div className="rounded-lg bg-orange-50 px-4 py-3 text-center flex-1">
                  <p className="text-2xl font-bold text-orange-600">{weekLate}</p>
                  <p className="text-xs text-orange-500">지각</p>
                </div>
              </div>
              {weekAttendanceIssues.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {weekAttendanceIssues.slice(0, 5).map((issue) => (
                    <div key={issue.id} className="flex justify-between text-xs border-b pb-1">
                      <span className="text-muted-foreground">{issue.date.substring(5)}</span>
                      <Badge variant="outline" className={issue.status === '결근' ? 'text-red-600' : 'text-orange-600'}>
                        {issue.status}
                      </Badge>
                    </div>
                  ))}
                  {weekAttendanceIssues.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">+{weekAttendanceIssues.length - 5}건 더</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* 빠른 링크 */}
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">빠른 작업</h2>
          <div className="grid grid-cols-1 gap-2">
            <Link href="/production/plan" className="flex items-center gap-2 rounded-md border p-3 text-sm hover:bg-gray-50 transition-colors">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-xs">📋</span>
              <div>
                <p className="font-medium">주간 생산계획</p>
                <p className="text-xs text-muted-foreground">설비별 가동 계획 입력</p>
              </div>
            </Link>
            <Link href="/staffing/calculate" className="flex items-center gap-2 rounded-md border p-3 text-sm hover:bg-gray-50 transition-colors">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-green-100 text-xs">🔢</span>
              <div>
                <p className="font-medium">인원산출</p>
                <p className="text-xs text-muted-foreground">필요 인원 자동 계산</p>
              </div>
            </Link>
            <Link href="/staffing/assign" className="flex items-center gap-2 rounded-md border p-3 text-sm hover:bg-gray-50 transition-colors">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-100 text-xs">👥</span>
              <div>
                <p className="font-medium">인력배치표</p>
                <p className="text-xs text-muted-foreground">자동 배치 및 수동 조정</p>
              </div>
            </Link>
            <Link href="/reports/labor" className="flex items-center gap-2 rounded-md border p-3 text-sm hover:bg-gray-50 transition-colors">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-xs">📊</span>
              <div>
                <p className="font-medium">근무실적 리포트</p>
                <p className="text-xs text-muted-foreground">근무일수·특근·출결 집계</p>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
