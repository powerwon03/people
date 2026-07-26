import { createClient } from '@/lib/supabase/server';
import { EmployeeTable } from '@/components/master/employee-table';

export default async function EmployeesPage(): Promise<React.ReactElement> {
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from('saehan_employees')
    .select('*')
    .eq('status', '재직')
    .order('department')
    .order('shift_group')
    .order('name');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">직원 관리</h1>
      </div>
      <EmployeeTable employees={employees ?? []} />
    </div>
  );
}
