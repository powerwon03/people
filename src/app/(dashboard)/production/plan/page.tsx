import { createClient } from '@/lib/supabase/server';
import { ProductionPlanGrid } from '@/components/production/production-plan-grid';

export default async function ProductionPlanPage(): Promise<React.ReactElement> {
  const supabase = await createClient();

  const { data: equipment } = await supabase
    .from('saehan_equipment')
    .select('id, code, name, type, factory_id, factory:saehan_factories(id, name)')
    .eq('is_active', true)
    .order('factory_id')
    .order('sort_order');

  const { data: products } = await supabase
    .from('saehan_products')
    .select('id, name, volume_ml, box_count_12h')
    .order('name');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">주간 생산계획</h1>
      </div>
      <ProductionPlanGrid
        equipment={equipment ?? []}
        products={products ?? []}
      />
    </div>
  );
}
