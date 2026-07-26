import { createClient } from '@/lib/supabase/server';
import { EquipmentStatusBoard } from '@/components/production/equipment-status-board';

export default async function EquipmentStatusPage(): Promise<React.ReactElement> {
  const supabase = await createClient();

  const { data: equipment } = await supabase
    .from('saehan_equipment')
    .select('id, code, name, type, stage, air_usage_33k, air_usage_25k, is_active, factory_id, factory:saehan_factories(id, name)')
    .eq('is_active', true)
    .order('factory_id')
    .order('sort_order');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설비 가동현황</h1>
      <EquipmentStatusBoard equipment={equipment ?? []} />
    </div>
  );
}
