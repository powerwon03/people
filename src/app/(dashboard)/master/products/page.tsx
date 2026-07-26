import { createClient } from '@/lib/supabase/server';
import { ProductTable } from '@/components/master/product-table';

export default async function ProductsPage(): Promise<React.ReactElement> {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('saehan_products')
    .select('*')
    .order('name');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">제품 관리</h1>
      </div>
      <ProductTable products={products ?? []} />
    </div>
  );
}
