import { createClient } from '@/lib/supabase/server';
import { AssignmentView } from '@/components/staffing/assignment-view';

export default async function StaffingAssignPage(): Promise<React.ReactElement> {
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from('saehan_employees')
    .select('id, name, department, shift_group, role, gender, affiliation')
    .eq('status', '재직')
    .order('department')
    .order('shift_group')
    .order('name');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">인력배치표</h1>
      <AssignmentView employees={employees ?? []} />
    </div>
  );
}
