import { createClient } from '@/lib/supabase/server';
import { StaffingRulesView } from '@/components/staffing/staffing-rules-view';

export default async function StaffingRulesPage(): Promise<React.ReactElement> {
  const supabase = await createClient();

  const { data: rules } = await supabase
    .from('saehan_staffing_rules')
    .select('*, factory:saehan_factories(name)')
    .order('factory_id')
    .order('sort_order');

  const { data: packagingRules } = await supabase
    .from('saehan_packaging_rules')
    .select('*, factory:saehan_factories(name)')
    .order('factory_id')
    .order('min_boxes');

  const { data: factories } = await supabase
    .from('saehan_factories')
    .select('id, name')
    .order('name');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">인원산출 규칙 관리</h1>
      <StaffingRulesView
        rules={rules ?? []}
        packagingRules={packagingRules ?? []}
        factories={factories ?? []}
      />
    </div>
  );
}
