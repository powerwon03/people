import { createClient } from '@/lib/supabase/server';
import { EquipmentTable } from '@/components/master/equipment-table';

export default async function EquipmentPage(): Promise<React.ReactElement> {
  const supabase = await createClient();

  const [eqRes, factoryRes, productRes] = await Promise.all([
    supabase
      .from('saehan_equipment')
      .select('*, factory:saehan_factories(name)')
      .order('factory_id')
      .order('sort_order'),
    supabase
      .from('saehan_factories')
      .select('id, name')
      .order('name'),
    supabase
      .from('saehan_products')
      .select('id, name, volume_ml')
      .order('name'),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">설비 관리</h1>
      </div>
      <EquipmentTable
        equipment={eqRes.data ?? []}
        factories={factoryRes.data ?? []}
        products={productRes.data ?? []}
      />
    </div>
  );
}
