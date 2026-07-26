import { createClient } from '@/lib/supabase/server';
import { StaffingResultView } from '@/components/staffing/staffing-result-view';

export default async function StaffingCalculatePage(): Promise<React.ReactElement> {
  const supabase = await createClient();

  const [plansRes, employeeRes] = await Promise.all([
    supabase
      .from('saehan_production_plans')
      .select('id, week_start_date, revision, status')
      .order('week_start_date', { ascending: false })
      .limit(10),
    supabase
      .from('saehan_employees')
      .select('id')
      .eq('status', '재직'),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">인원산출 결과</h1>
      <StaffingResultView
        plans={plansRes.data ?? []}
        employeeCount={employeeRes.data?.length ?? 0}
      />
    </div>
  );
}
