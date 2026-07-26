import { createClient } from '@/lib/supabase/server';
import { AnnualScheduleView } from '@/components/schedule/annual-schedule-view';

export default async function AnnualSchedulePage(): Promise<React.ReactElement> {
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from('saehan_employees')
    .select('id, name, department, shift_group, role')
    .eq('status', '재직')
    .order('department')
    .order('shift_group')
    .order('name');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">연간 근무계획표</h1>
      <AnnualScheduleView employees={employees ?? []} />
    </div>
  );
}
