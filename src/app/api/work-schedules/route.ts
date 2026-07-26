import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 월별 근무 스케줄 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  if (!year || !month) {
    return NextResponse.json({ error: 'year, month 필수' }, { status: 400 });
  }

  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;

  const { data, error } = await supabase
    .from('saehan_work_schedules')
    .select('employee_id, date, shift_type')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// 개별 스케줄 수정
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const body = await request.json();
  const { employee_id, date, shift_type } = body;

  // upsert: 있으면 업데이트, 없으면 삽입
  const { data, error } = await supabase
    .from('saehan_work_schedules')
    .upsert(
      { employee_id, date, shift_type, is_confirmed: true },
      { onConflict: 'employee_id,date' },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
