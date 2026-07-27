import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 저장된 배치 조회
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const shift = searchParams.get('shift');

  if (!date || !shift) {
    return NextResponse.json({ error: 'date, shift 필수' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('saehan_worker_assignments')
    .select('*, employee:saehan_employees(name, department, role, gender, affiliation, shift_group)')
    .eq('date', date)
    .eq('shift', shift)
    .order('department')
    .order('role');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ date, shift, assignments: data ?? [], saved: (data?.length ?? 0) > 0 });
}

// 배치 저장 (일괄)
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const body = await request.json();

  const { date, shift, assignments } = body as {
    date: string;
    shift: string;
    assignments: {
      employee_id: string;
      department: string;
      role: string;
      sub_department: string | null;
      is_cross_assigned: boolean;
      cross_from: string | null;
      status: string;
      notes: string | null;
    }[];
  };

  // 기존 배치 삭제
  const { error: deleteError } = await supabase
    .from('saehan_worker_assignments')
    .delete()
    .eq('date', date)
    .eq('shift', shift);

  if (deleteError) {
    return NextResponse.json({ error: `기존 배치 삭제 실패: ${deleteError.message}` }, { status: 500 });
  }

  if (assignments.length > 0) {
    const rows = assignments.map((a) => ({
      date,
      shift,
      department: a.department,
      role: a.role,
      sub_department: a.sub_department,
      employee_id: a.employee_id,
      is_cross_assigned: a.is_cross_assigned,
      cross_from: a.cross_from,
      status: a.status ?? '자동배치',
      notes: a.notes,
    }));

    const { error } = await supabase
      .from('saehan_worker_assignments')
      .insert(rows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, count: assignments.length });
}

// 개별 배치 수정
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const body = await request.json();
  const { id, ...updates } = body;

  updates.status = '수정';

  const { data, error } = await supabase
    .from('saehan_worker_assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
