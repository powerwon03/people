import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateStaffing } from '@/lib/staffing-engine/calculator';
import type { EquipmentOperation, Shift } from '@/types';

// 저장된 산출 결과 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const planId = new URL(request.url).searchParams.get('plan_id');

  if (!planId) {
    return NextResponse.json({ error: 'plan_id 필수' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('saehan_staffing_calculations')
    .select('*')
    .eq('plan_id', planId)
    .order('date')
    .order('shift');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ plan_id: planId, results: [], saved: false });
  }

  // DB 저장 형식을 프론트엔드 형식으로 변환
  const results = data.map((row: {
    date: string;
    shift: string;
    factory_id: string;
    equipment_headcount: Record<string, number> | null;
    base_required: number;
    packaging_additional: number;
    total_required: number;
    available_count: number;
    gap: number;
  }) => ({
    date: row.date,
    shift: row.shift,
    factory_id: row.factory_id,
    equipment_details: row.equipment_headcount ?? {},
    base_required: Number(row.base_required),
    packaging_additional: row.packaging_additional,
    total_required: Number(row.total_required),
    available_count: row.available_count,
    gap: row.gap,
  }));

  // 날짜+교대별로 그룹핑
  const grouped = new Map<string, {
    date: string;
    shift: string;
    results: typeof results;
    available_count: number;
    total_required: number;
    gap: number;
    equipment_count: number;
  }>();

  for (const r of results) {
    const key = `${r.date}_${r.shift}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        date: r.date,
        shift: r.shift,
        results: [],
        available_count: r.available_count,
        total_required: 0,
        gap: 0,
        equipment_count: Object.keys(r.equipment_details).length,
      });
    }
    const group = grouped.get(key)!;
    group.results.push(r);
    group.total_required += r.total_required;
    group.gap = group.available_count - group.total_required;
    group.equipment_count += Object.keys(r.equipment_details).length;
  }

  const dateResults = Array.from(grouped.values());
  const totalRequired = dateResults.reduce((s, r) => s + r.total_required, 0);
  const totalAvailable = dateResults.reduce((s, r) => s + r.available_count, 0);

  return NextResponse.json({
    plan_id: planId,
    results: dateResults,
    saved: true,
    summary: {
      total_dates: dateResults.length,
      total_required: totalRequired,
      total_available: totalAvailable,
    },
  });
}

// 산출 실행 + DB 저장
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const body = await request.json();

  if (body.batch && body.plan_id) {
    return handleBatch(supabase, body.plan_id);
  }

  const { plan_id, date, shift } = body as {
    plan_id: string; date: string; shift: Shift;
  };

  const result = await calculateForDateShift(supabase, plan_id, date, shift);
  return NextResponse.json(result);
}

async function calculateForDateShift(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  planId: string,
  date: string,
  shift: Shift,
): Promise<Record<string, unknown>> {
  const { data: details } = await supabase
    .from('saehan_production_plan_details')
    .select('*, equipment:saehan_equipment(code, factory_id), product:saehan_products(name, box_count_12h)')
    .eq('plan_id', planId)
    .eq('date', date)
    .eq('shift', shift);

  const factory1Ops: EquipmentOperation[] = [];
  const factory2Ops: EquipmentOperation[] = [];

  for (const d of details ?? []) {
    const op: EquipmentOperation = {
      equipment_code: d.equipment?.code ?? '',
      is_operating: d.status === '가동',
      product_name: d.product?.name ?? null,
      product_id: d.product_id,
      box_count_12h: d.product?.box_count_12h ?? null,
    };
    if (d.equipment?.factory_id === 'f1000000-0000-0000-0000-000000000001') factory1Ops.push(op);
    else if (d.equipment?.factory_id === 'f2000000-0000-0000-0000-000000000002') factory2Ops.push(op);
  }

  const results = [];
  if (factory1Ops.length > 0) {
    results.push(calculateStaffing({ date, shift, factory_id: 'f1000000-0000-0000-0000-000000000001', operations: factory1Ops }));
  }
  if (factory2Ops.length > 0) {
    results.push(calculateStaffing({ date, shift, factory_id: 'f2000000-0000-0000-0000-000000000002', operations: factory2Ops }));
  }

  const { data: schedules } = await supabase
    .from('saehan_work_schedules')
    .select('employee_id')
    .eq('date', date)
    .eq('shift_type', shift === '주간' ? '주' : '야');

  const availableCount = schedules?.length ?? 0;
  const totalRequired = results.reduce((s, r) => s + r.total_required, 0);

  return {
    date, shift, results,
    available_count: availableCount,
    total_required: totalRequired,
    gap: availableCount - totalRequired,
    equipment_count: (details ?? []).filter((d: { status: string }) => d.status === '가동').length,
  };
}

async function handleBatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  planId: string,
): Promise<NextResponse> {
  const { data: details } = await supabase
    .from('saehan_production_plan_details')
    .select('date, shift')
    .eq('plan_id', planId);

  if (!details || details.length === 0) {
    return NextResponse.json({ plan_id: planId, results: [], saved: true, message: '생산계획 상세 데이터가 없습니다.' });
  }

  const uniquePairs = new Map<string, { date: string; shift: Shift }>();
  for (const d of details) {
    const key = `${d.date}_${d.shift}`;
    if (!uniquePairs.has(key)) uniquePairs.set(key, { date: d.date, shift: d.shift as Shift });
  }

  const sortedPairs = Array.from(uniquePairs.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.shift === '주간' ? -1 : 1;
  });

  // 기존 산출 결과 삭제 후 재산출
  await supabase
    .from('saehan_staffing_calculations')
    .delete()
    .eq('plan_id', planId);

  const allResults = [];
  for (const pair of sortedPairs) {
    const result = await calculateForDateShift(supabase, planId, pair.date, pair.shift);
    allResults.push(result);

    // 공장별 산출 결과를 DB에 저장
    const factoryResults = result.results as Array<{
      factory_id: string;
      equipment_details: Record<string, number>;
      base_required: number;
      packaging_additional: number;
      total_required: number;
    }>;

    for (const fr of factoryResults) {
      await supabase.from('saehan_staffing_calculations').insert({
        plan_id: planId,
        date: pair.date,
        shift: pair.shift,
        factory_id: fr.factory_id,
        equipment_headcount: fr.equipment_details,
        base_required: fr.base_required,
        packaging_additional: fr.packaging_additional,
        total_required: fr.total_required,
        available_count: result.available_count as number,
        gap: (result.available_count as number) - fr.total_required,
      });
    }
  }

  const totalRequired = allResults.reduce((s, r) => s + (r.total_required as number), 0);
  const totalAvailable = allResults.reduce((s, r) => s + (r.available_count as number), 0);

  return NextResponse.json({
    plan_id: planId,
    results: allResults,
    saved: true,
    summary: {
      total_dates: sortedPairs.length,
      total_required: totalRequired,
      total_available: totalAvailable,
    },
  });
}
