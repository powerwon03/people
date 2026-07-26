import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 설비별 생산 가능 제품 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const equipmentId = new URL(request.url).searchParams.get('equipment_id');

  if (equipmentId) {
    const { data, error } = await supabase
      .from('saehan_equipment_products')
      .select('*, product:saehan_products(id, name, volume_ml, box_count_12h)')
      .eq('equipment_id', equipmentId)
      .order('is_default', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // 전체 조회
  const { data, error } = await supabase
    .from('saehan_equipment_products')
    .select('equipment_id, product_id, is_default, product:saehan_products(id, name)')
    .order('equipment_id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 설비에 제품 연결
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('saehan_equipment_products')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

// 연결 해제
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const equipmentId = searchParams.get('equipment_id');
  const productId = searchParams.get('product_id');

  if (id) {
    const { error } = await supabase.from('saehan_equipment_products').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (equipmentId && productId) {
    const { error } = await supabase.from('saehan_equipment_products').delete()
      .eq('equipment_id', equipmentId).eq('product_id', productId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    return NextResponse.json({ error: 'id 또는 equipment_id+product_id 필수' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
