import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type CellStatus = '가동' | '대기' | '부동' | '금형이상' | '몰드체인지' | 'confirm';

const VALID_STATUSES = new Set<string>(['가동', '대기', '부동', '금형이상', '몰드체인지', 'confirm']);

function parseCSV(text: string): string[][] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim()));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const weekStartDate = formData.get('week_start_date') as string | null;
  const shift = formData.get('shift') as string | null;

  if (!file || !weekStartDate || !shift) {
    return NextResponse.json({ error: 'file, week_start_date, shift 필수' }, { status: 400 });
  }

  // 확정된 계획은 업로드 불가
  const { data: confirmed } = await supabase
    .from('saehan_production_plans')
    .select('id')
    .eq('week_start_date', weekStartDate)
    .eq('status', '확정')
    .limit(1)
    .maybeSingle();

  if (confirmed) {
    return NextResponse.json({ error: '확정된 생산계획은 수정할 수 없습니다.' }, { status: 400 });
  }

  // CSV 파싱
  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length < 2) {
    return NextResponse.json({ error: 'CSV에 헤더와 데이터가 필요합니다.' }, { status: 400 });
  }

  const headers = rows[0];
  // headers[0] = '설비코드', headers[1..] = 날짜 (YYYY-MM-DD)
  const dateColumns = headers.slice(1);

  // 설비 코드 → ID 매핑
  const { data: equipment } = await supabase
    .from('saehan_equipment')
    .select('id, code')
    .eq('is_active', true);

  const codeToId = new Map<string, string>();
  for (const eq of equipment ?? []) {
    codeToId.set(eq.code, eq.id);
  }

  // 상세 데이터 구성
  const details: {
    equipment_id: string;
    date: string;
    shift: string;
    product_id: null;
    status: string;
    notes: null;
  }[] = [];

  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const eqCode = row[0];
    const eqId = codeToId.get(eqCode);

    if (!eqId) {
      errors.push(`${r + 1}행: 알 수 없는 설비코드 "${eqCode}"`);
      continue;
    }

    for (let c = 1; c < row.length && c <= dateColumns.length; c++) {
      const status = row[c];
      if (!status) continue;

      if (!VALID_STATUSES.has(status)) {
        errors.push(`${r + 1}행 ${c + 1}열: 잘못된 상태 "${status}"`);
        continue;
      }

      details.push({
        equipment_id: eqId,
        date: dateColumns[c - 1],
        shift,
        product_id: null,
        status: status as CellStatus,
        notes: null,
      });
    }
  }

  if (errors.length > 0 && details.length === 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
  }

  // 기존 계획 찾기 또는 생성
  const { data: existing } = await supabase
    .from('saehan_production_plans')
    .select('id')
    .eq('week_start_date', weekStartDate)
    .eq('status', '잠정')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let planId: string;

  if (existing) {
    planId = existing.id;
    // 해당 shift의 기존 상세만 삭제 (다른 shift 데이터 보존)
    await supabase
      .from('saehan_production_plan_details')
      .delete()
      .eq('plan_id', planId)
      .eq('shift', shift);
  } else {
    const { data: plan, error: planError } = await supabase
      .from('saehan_production_plans')
      .insert({ week_start_date: weekStartDate, status: '잠정' })
      .select()
      .single();

    if (planError) {
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }
    planId = plan.id;
  }

  // 상세 데이터 삽입
  if (details.length > 0) {
    const detailRows = details.map((d) => ({ plan_id: planId, ...d }));
    const { error: detailError } = await supabase
      .from('saehan_production_plan_details')
      .insert(detailRows);

    if (detailError) {
      return NextResponse.json({ error: detailError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    count: details.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
