import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get('week_start');

  let query = supabase
    .from('saehan_production_plans')
    .select(`
      *,
      details:saehan_production_plan_details(
        *,
        equipment:saehan_equipment(code, name, factory_id),
        product:saehan_products(name, box_count_12h)
      )
    `)
    .order('week_start_date', { ascending: false })
    .limit(5);

  if (weekStart) {
    query = query.eq('week_start_date', weekStart);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const body = await request.json();

  const { week_start_date, details } = body as {
    week_start_date: string;
    details: {
      equipment_id: string;
      date: string;
      shift: string;
      product_id: string | null;
      status: string;
      notes: string | null;
    }[];
  };

  // 오늘 이전 날짜의 데이터가 포함되어 있으면 거부
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  const pastDetails = details.filter((d) => d.date < today);
  if (pastDetails.length > 0) {
    return NextResponse.json(
      { error: '과거 날짜의 생산계획은 수정할 수 없습니다.' },
      { status: 400 },
    );
  }

  // 확정된 계획은 수정 불가
  const { data: confirmed } = await supabase
    .from('saehan_production_plans')
    .select('id')
    .eq('week_start_date', week_start_date)
    .eq('status', '확정')
    .limit(1)
    .maybeSingle();

  if (confirmed) {
    return NextResponse.json(
      { error: '확정된 생산계획은 수정할 수 없습니다.' },
      { status: 400 },
    );
  }

  // 기존 같은 주 계획이 있으면 상세만 교체 (upsert 방식)
  const { data: existing } = await supabase
    .from('saehan_production_plans')
    .select('id')
    .eq('week_start_date', week_start_date)
    .eq('status', '잠정')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let planId: string;

  if (existing) {
    planId = existing.id;
    // 기존 상세 삭제
    await supabase
      .from('saehan_production_plan_details')
      .delete()
      .eq('plan_id', planId);
  } else {
    // 새 계획 생성
    const { data: plan, error: planError } = await supabase
      .from('saehan_production_plans')
      .insert({ week_start_date, status: '잠정' })
      .select()
      .single();

    if (planError) {
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }
    planId = plan.id;
  }

  // 상세 데이터 일괄 삽입
  if (details.length > 0) {
    const detailRows = details.map((d) => ({
      plan_id: planId,
      equipment_id: d.equipment_id,
      date: d.date,
      shift: d.shift,
      product_id: d.product_id,
      status: d.status,
      notes: d.notes,
    }));

    const { error: detailError } = await supabase
      .from('saehan_production_plan_details')
      .insert(detailRows);

    if (detailError) {
      return NextResponse.json({ error: detailError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: planId, week_start_date, status: '잠정' }, { status: 201 });
}
